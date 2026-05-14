import { Router, Request, Response, NextFunction } from "express";
import { ServiceProvider } from "@vest/core";
import { TelescopeStore } from "./TelescopeStore.js";
import { renderTelescopeDashboard } from "./TelescopeDashboard.js";
import {
  requestWatcher,
  initRequestWatcher,
  exceptionWatcher,
  activateJobWatcher,
  activateSchedulerWatcher,
  activateLogWatcher,
  QueryWatcher,
} from "./Watchers/index.js";
import { OpenApiGenerator } from "@vest/router";
import telescopeConfig from "./telescope.config.js";

/*
|--------------------------------------------------------------------------
| Telescope Service Provider
|--------------------------------------------------------------------------
|
| register() — adds the requestWatcher middleware BEFORE routes are mounted,
| so it intercepts every request. This is intentional; register() is called
| for all providers before any boot() is called.
|
| boot()     — activates remaining watchers, mounts the dashboard routes,
| and registers the management endpoints in /docs.
|
| Configuration is read from src/config/telescope.config.ts.
|
*/

export class TelescopeServiceProvider extends ServiceProvider {
  /*
  |--------------------------------------------------------------------------
  | register() — runs before any boot(), so before routes are mounted
  |--------------------------------------------------------------------------
  */
  register(): void {
    if (!this.isEnabled()) return;
    if (!telescopeConfig.watchers.requests) return;

    // Configure then register the plain middleware (before routes mount).
    initRequestWatcher(telescopeConfig);
    this.app.getExpressApp().use(requestWatcher);
  }

  /*
  |--------------------------------------------------------------------------
  | boot() — everything else after all providers have registered
  |--------------------------------------------------------------------------
  */
  async boot(): Promise<void> {
    if (!this.isEnabled()) return;

    const { path: basePath, token, watchers } = telescopeConfig;
    const expressApp = this.app.getExpressApp();

    /*
    |--------------------------------------------------------------------------
    | Activate background watchers
    |--------------------------------------------------------------------------
    */
    if (watchers.jobs) activateJobWatcher();
    if (watchers.scheduler || watchers.schedule) activateSchedulerWatcher();
    if (watchers.queries) QueryWatcher.activate();
    if (watchers.logs) activateLogWatcher();

    /*
    |--------------------------------------------------------------------------
    | Auth guard
    |--------------------------------------------------------------------------
    */
    const guard = (req: Request, res: Response, next: NextFunction): void => {
      if (!token) return next();
      const bearer = req.headers.authorization?.replace("Bearer ", "");
      const queryToken = (req.query as any).token as string | undefined;
      if (bearer === token || queryToken === token) return next();
      if (req.path === "/" || req.path === "") {
        res.status(401).send(unauthorizedHtml(basePath));
        return;
      }
      res.status(401).json({ error: "Unauthorized" });
    };

    const router = Router();
    router.use(guard);

    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    */
    router.get("/", (_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderTelescopeDashboard(basePath, token));
    });

    /*
    |--------------------------------------------------------------------------
    | API — Entries
    |--------------------------------------------------------------------------
    */
    router.get("/api/entries", (req, res) => {
      const q = req.query as Record<string, string>;
      res.json(
        TelescopeStore.getEntries({
          type: q.type as any,
          limit: q.limit ? parseInt(q.limit, 10) : 100,
          before: q.before,
          tag: q.tag,
          search: q.search,
        }),
      );
    });

    router.get("/api/entries/:id", (req, res) => {
      const entry = TelescopeStore.getEntry(req.params.id);
      if (!entry) return res.status(404).json({ error: "Entry not found" });
      res.json(entry);
    });

    router.delete("/api/entries", (req, res) => {
      const type = (req.query as any).type;
      TelescopeStore.clear(type);
      res.json({ cleared: true });
    });

    /*
    |--------------------------------------------------------------------------
    | API — Stats
    |--------------------------------------------------------------------------
    */
    router.get("/api/stats", (_req, res) => res.json(TelescopeStore.stats()));

    /*
    |--------------------------------------------------------------------------
    | API — Per-minute chart metrics (computed from in-memory store)
    |--------------------------------------------------------------------------
    */
    router.get("/api/metrics", (req, res) => {
      const minutes = Math.min(parseInt((req.query as any).minutes || "60", 10), 180);
      const now = Date.now();
      const currentMinute = Math.floor(now / 60_000) * 60_000;

      // Build empty buckets for the last N minutes
      const reqBuckets: Record<
        number,
        { ts: number; count: number; totalDuration: number; errors: number; durations: number[] }
      > = {};
      const queryBuckets: Record<
        number,
        { ts: number; count: number; totalDuration: number; slowCount: number }
      > = {};

      for (let i = 0; i < minutes; i++) {
        const ts = currentMinute - (minutes - 1 - i) * 60_000;
        reqBuckets[ts] = { ts, count: 0, totalDuration: 0, errors: 0, durations: [] };
        queryBuckets[ts] = { ts, count: 0, totalDuration: 0, slowCount: 0 };
      }

      // Fill from entries
      for (const entry of TelescopeStore.getEntries({ type: "request", limit: 2000 })) {
        const ts = Math.floor(new Date(entry.createdAt).getTime() / 60_000) * 60_000;
        const b = reqBuckets[ts];
        if (!b) continue;
        const dur = entry.content.duration ?? 0;
        b.count++;
        b.totalDuration += dur;
        b.durations.push(dur);
        if ((entry.content.status ?? 200) >= 400) b.errors++;
      }
      for (const entry of TelescopeStore.getEntries({ type: "query", limit: 2000 })) {
        const ts = Math.floor(new Date(entry.createdAt).getTime() / 60_000) * 60_000;
        const b = queryBuckets[ts];
        if (!b) continue;
        const dur = entry.content.duration ?? 0;
        b.count++;
        b.totalDuration += dur;
        if (dur > 100) b.slowCount++;
      }

      const requests = Object.values(reqBuckets).map((b) => {
        const sorted = [...b.durations].sort((a, n) => a - n);
        return {
          ts: b.ts,
          count: b.count,
          avgDuration: b.count ? Math.round(b.totalDuration / b.count) : 0,
          p95Duration: sorted.length ? (sorted[Math.floor(sorted.length * 0.95)] ?? 0) : 0,
          errors: b.errors,
        };
      });

      const queries = Object.values(queryBuckets).map((b) => ({
        ts: b.ts,
        count: b.count,
        avgDuration: b.count ? Math.round(b.totalDuration / b.count) : 0,
        slowCount: b.slowCount,
      }));

      res.json({ requests, queries });
    });

    /*
    |--------------------------------------------------------------------------
    | API — Slowest requests and queries
    |--------------------------------------------------------------------------
    */
    router.get("/api/slow", (req, res) => {
      const limit = parseInt((req.query as any).limit || "10", 10);
      const requests = TelescopeStore.getEntries({ type: "request", limit: 500 })
        .sort((a, b) => (b.content.duration ?? 0) - (a.content.duration ?? 0))
        .slice(0, limit);
      const queries = TelescopeStore.getEntries({ type: "query", limit: 500 })
        .sort((a, b) => (b.content.duration ?? 0) - (a.content.duration ?? 0))
        .slice(0, limit);
      res.json({ requests, queries });
    });

    expressApp.use(basePath, router);

    /*
    |--------------------------------------------------------------------------
    | Exception watcher — must come after all routes AND the Telescope router
    |--------------------------------------------------------------------------
    */
    if (watchers.exceptions) {
      expressApp.use(exceptionWatcher);
    }

    /*
    |--------------------------------------------------------------------------
    | Register in /docs
    |--------------------------------------------------------------------------
    */
    this.registerDocs(basePath);

    console.log(`[Telescope] Dashboard available at ${basePath}`);
  }

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  private isEnabled(): boolean {
    if (telescopeConfig.enabled === false) return false;
    if (!telescopeConfig.token && process.env.NODE_ENV === "production") {
      console.warn("[Telescope] Disabled in production — set TELESCOPE_TOKEN to enable.");
      return false;
    }
    return true;
  }

  private registerDocs(base: string): void {
    const tag = {
      name: "Telescope",
      description: "Observability dashboard — inspect requests, exceptions, jobs, queries & logs",
    };
    const auth = telescopeConfig.token ? { security: [{ bearerAuth: [] }] } : {};

    OpenApiGenerator.registerPaths(
      {
        [`${base}`]: {
          get: {
            tags: ["Telescope"],
            summary: "Telescope Dashboard",
            description: "Serves the Telescope observability UI.",
            ...auth,
            responses: { 200: { description: "HTML dashboard" } },
          },
        },
        [`${base}/api/entries`]: {
          get: {
            tags: ["Telescope"],
            summary: "List entries",
            ...auth,
            parameters: [
              {
                name: "type",
                in: "query",
                schema: {
                  type: "string",
                  enum: ["request", "exception", "job", "schedule", "query", "log", "cache"],
                },
              },
              { name: "search", in: "query", schema: { type: "string" } },
              { name: "tag", in: "query", schema: { type: "string" } },
              { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
              { name: "before", in: "query", schema: { type: "string" } },
            ],
            responses: { 200: { description: "Array of TelescopeEntry" } },
          },
          delete: {
            tags: ["Telescope"],
            summary: "Clear entries",
            description: "Clears all entries or only those of a specific type.",
            ...auth,
            parameters: [
              {
                name: "type",
                in: "query",
                schema: { type: "string" },
                description: "Optional — clear only this entry type",
              },
            ],
            responses: { 200: { description: '{ "cleared": true }' } },
          },
        },
        [`${base}/api/entries/{id}`]: {
          get: {
            tags: ["Telescope"],
            summary: "Get entry detail",
            ...auth,
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {
              200: { description: "Single TelescopeEntry" },
              404: { description: "Entry not found" },
            },
          },
        },
        [`${base}/api/stats`]: {
          get: {
            tags: ["Telescope"],
            summary: "Entry counts by type",
            ...auth,
            responses: {
              200: {
                description: "Map of entry type → count",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        request: { type: "integer" },
                        exception: { type: "integer" },
                        job: { type: "integer" },
                        schedule: { type: "integer" },
                        query: { type: "integer" },
                        log: { type: "integer" },
                        cache: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      [tag],
    );
  }
}

function unauthorizedHtml(basePath: string): string {
  return `<!DOCTYPE html><html><head><title>Telescope — Unauthorized</title>
<style>body{background:#0f1117;color:#e2e8f0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px}
h1{color:#8b5cf6;font-size:20px}p{color:#94a3b8;font-size:13px}
input,button{padding:8px 12px;border-radius:6px;border:1px solid #2d3147;background:#1a1d28;color:#e2e8f0;font-family:monospace;font-size:13px}
button{cursor:pointer;border-color:#8b5cf6;color:#8b5cf6;margin-top:4px}</style>
</head><body>
<h1>TELESCOPE</h1><p>Enter your access token to continue.</p>
<input id="t" type="password" placeholder="Access token…">
<button onclick="location.href='${basePath}/?token='+document.getElementById('t').value">Authenticate</button>
</body></html>`;
}
