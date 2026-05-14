import { Router, Request, Response, NextFunction } from "express";
import { ServiceProvider } from "@vest/core";
import { horizonMetrics } from "./HorizonMetrics.js";
import { HorizonManager } from "./HorizonManager.js";
import { renderHorizonDashboard } from "./HorizonDashboard.js";
import { OpenApiGenerator } from "@vest/router";
import horizonConfig from "./horizon.config.js";

/*
|--------------------------------------------------------------------------
| Horizon Service Provider
|--------------------------------------------------------------------------
|
| Mounts the Horizon dashboard and JSON API under the configured path,
| then registers the management endpoints in the OpenAPI spec so they
| appear in /docs alongside the application's own routes.
|
| Configuration is read from src/config/horizon.config.ts.
| Environment variables can override individual values.
|
*/

export class HorizonServiceProvider extends ServiceProvider {
  register(): void {}

  async boot(): Promise<void> {
    if (!this.isEnabled()) return;

    const { path: basePath, token } = horizonConfig;
    const expressApp = this.app.getExpressApp();
    const router = Router();

    /*
    |--------------------------------------------------------------------------
    | Auth guard
    |--------------------------------------------------------------------------
    */
    router.use((req: Request, res: Response, next: NextFunction) => {
      if (!token) return next();
      const bearer = req.headers.authorization?.replace("Bearer ", "");
      const queryToken = (req.query as any).token as string | undefined;
      if (bearer === token || queryToken === token) return next();
      if (req.path === "/" || req.path === "") {
        res.status(401).send(unauthorizedHtml(basePath));
        return;
      }
      res.status(401).json({ error: "Unauthorized" });
    });

    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    */
    router.get("/", (_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderHorizonDashboard(basePath, token));
    });

    /*
    |--------------------------------------------------------------------------
    | API — Stats
    |--------------------------------------------------------------------------
    */
    router.get("/api/stats", async (_req, res) => res.json(await horizonMetrics.summary()));

    /*
    |--------------------------------------------------------------------------
    | API — Workers
    |--------------------------------------------------------------------------
    */
    router.get("/api/workers", async (_req, res) => res.json(await horizonMetrics.getWorkers()));

    router.post("/api/workers/:id/pause", (req, res) => {
      res.json({ success: HorizonManager.pauseWorker(req.params.id) });
    });

    router.post("/api/workers/:id/resume", (req, res) => {
      res.json({ success: HorizonManager.resumeWorker(req.params.id) });
    });

    router.post("/api/workers/:id/stop", (req, res) => {
      res.json({ success: HorizonManager.stopWorker(req.params.id) });
    });

    /*
    |--------------------------------------------------------------------------
    | API — Queue sizes
    |--------------------------------------------------------------------------
    */
    router.get("/api/queues", async (_req, res) => {
      try {
        res.json(await HorizonManager.getQueueSizes());
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    /*
    |--------------------------------------------------------------------------
    | API — Jobs
    |--------------------------------------------------------------------------
    */
    router.get("/api/jobs/recent", async (req, res) => {
      const limit = parseInt((req.query as any).limit || "50", 10);
      res.json(await horizonMetrics.getRecentJobs(limit));
    });

    router.get("/api/jobs/failed", async (_req, res) => {
      try {
        res.json(await HorizonManager.getFailedJobs());
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    router.post("/api/jobs/failed/:uuid/retry", async (req, res) => {
      try {
        res.json({ success: await HorizonManager.retryFailed(req.params.uuid) });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    router.delete("/api/jobs/failed/:uuid", async (req, res) => {
      try {
        res.json({ success: await HorizonManager.forgetFailed(req.params.uuid) });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    router.delete("/api/jobs/failed", async (_req, res) => {
      try {
        res.json({ flushed: await HorizonManager.flushFailed() });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    /*
    |--------------------------------------------------------------------------
    | API — Scheduler
    |--------------------------------------------------------------------------
    */
    router.get("/api/scheduler", (_req, res) => {
      res.json(HorizonManager.getSchedulerTasks());
    });

    /*
    |--------------------------------------------------------------------------
    | API — Chart metrics (per-minute buckets, last 60 min)
    |--------------------------------------------------------------------------
    */
    router.get("/api/metrics", async (req, res) => {
      const minutes = Math.min(parseInt((req.query as any).minutes || "60", 10), 180);
      try {
        res.json(await horizonMetrics.getMetrics(minutes));
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    expressApp.use(basePath, router);

    /*
    |--------------------------------------------------------------------------
    | Register in /docs
    |--------------------------------------------------------------------------
    */
    this.registerDocs(basePath);

    console.log(`[Horizon] Dashboard available at ${basePath}`);
  }

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  private isEnabled(): boolean {
    if (horizonConfig.enabled === false) return false;
    if (!horizonConfig.token && process.env.NODE_ENV === "production") {
      console.warn("[Horizon] Disabled in production — set HORIZON_TOKEN to enable.");
      return false;
    }
    return true;
  }

  private registerDocs(base: string): void {
    const tag = { name: "Horizon", description: "Queue manager dashboard & worker control API" };

    const auth = horizonConfig.token ? { security: [{ bearerAuth: [] }] } : {};

    OpenApiGenerator.registerPaths(
      {
        [`${base}`]: {
          get: {
            tags: ["Horizon"],
            summary: "Horizon Dashboard",
            description: "Serves the Horizon queue-manager UI.",
            ...auth,
            responses: { 200: { description: "HTML dashboard" } },
          },
        },
        [`${base}/api/stats`]: {
          get: {
            tags: ["Horizon"],
            summary: "Get metrics summary",
            description:
              "Returns active worker count, throughput, processed/failed totals, memory, and uptime.",
            ...auth,
            responses: {
              200: {
                description: "Summary object",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        workers: { type: "integer" },
                        activeWorkers: { type: "integer" },
                        pausedWorkers: { type: "integer" },
                        throughputPerMinute: { type: "integer" },
                        totalProcessed: { type: "integer" },
                        totalFailed: { type: "integer" },
                        memoryMb: { type: "number" },
                        uptimeSeconds: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        [`${base}/api/workers`]: {
          get: {
            tags: ["Horizon"],
            summary: "List workers",
            description: "Returns all registered worker snapshots.",
            ...auth,
            responses: { 200: { description: "Array of WorkerSnapshot objects" } },
          },
        },
        [`${base}/api/workers/{id}/pause`]: {
          post: {
            tags: ["Horizon"],
            summary: "Pause worker",
            ...auth,
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: '{ "success": true }' } },
          },
        },
        [`${base}/api/workers/{id}/resume`]: {
          post: {
            tags: ["Horizon"],
            summary: "Resume worker",
            ...auth,
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: '{ "success": true }' } },
          },
        },
        [`${base}/api/workers/{id}/stop`]: {
          post: {
            tags: ["Horizon"],
            summary: "Stop worker",
            ...auth,
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: '{ "success": true }' } },
          },
        },
        [`${base}/api/queues`]: {
          get: {
            tags: ["Horizon"],
            summary: "Queue sizes",
            ...auth,
            responses: { 200: { description: "Map of queue name → pending job count" } },
          },
        },
        [`${base}/api/jobs/recent`]: {
          get: {
            tags: ["Horizon"],
            summary: "Recent completed jobs",
            ...auth,
            parameters: [
              {
                name: "limit",
                in: "query",
                schema: { type: "integer", default: 50 },
              },
            ],
            responses: { 200: { description: "Array of CompletedJobRecord" } },
          },
        },
        [`${base}/api/jobs/failed`]: {
          get: {
            tags: ["Horizon"],
            summary: "List failed jobs",
            ...auth,
            responses: { 200: { description: "Array of FailedJob records" } },
          },
          delete: {
            tags: ["Horizon"],
            summary: "Flush all failed jobs",
            ...auth,
            responses: { 200: { description: '{ "flushed": N }' } },
          },
        },
        [`${base}/api/jobs/failed/{uuid}/retry`]: {
          post: {
            tags: ["Horizon"],
            summary: "Retry a failed job",
            ...auth,
            parameters: [{ name: "uuid", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: '{ "success": true }' } },
          },
        },
        [`${base}/api/jobs/failed/{uuid}`]: {
          delete: {
            tags: ["Horizon"],
            summary: "Delete a failed job",
            ...auth,
            parameters: [{ name: "uuid", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: '{ "success": true }' } },
          },
        },
        [`${base}/api/scheduler`]: {
          get: {
            tags: ["Horizon"],
            summary: "Scheduled tasks",
            description: "Returns all registered scheduled tasks with next/last run times.",
            ...auth,
            responses: { 200: { description: "Array of SchedulerTaskInfo" } },
          },
        },
      },
      [tag],
    );
  }
}

function unauthorizedHtml(basePath: string): string {
  return `<!DOCTYPE html><html><head><title>Horizon — Unauthorized</title>
<style>body{background:#0f1117;color:#e2e8f0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px}
h1{color:#6366f1;font-size:20px}p{color:#94a3b8;font-size:13px}
input,button{padding:8px 12px;border-radius:6px;border:1px solid #2d3147;background:#1a1d28;color:#e2e8f0;font-family:monospace;font-size:13px}
button{cursor:pointer;border-color:#6366f1;color:#6366f1;margin-top:4px}</style>
</head><body>
<h1>HORIZON</h1><p>Enter your access token to continue.</p>
<input id="t" type="password" placeholder="Access token…">
<button onclick="location.href='${basePath}/?token='+document.getElementById('t').value">Authenticate</button>
</body></html>`;
}
