import { getEventDispatcher } from "@vest-ts/events";
import { TELESCOPE_QUERY_CACHE_KEY } from "@vest-ts/db";
import { TelescopeStore } from "../TelescopeStore.js";

/*
|--------------------------------------------------------------------------
| Query Watcher
|--------------------------------------------------------------------------
|
| Two complementary strategies:
|
| 1. In-process (same process as HTTP server):
|    Listens to the `db:query` EventDispatcher event emitted by both
|    DB.executeQuery() (MySQL) and the MongoDB collection proxy.
|    Zero latency, no Cache involved.
|
| 2. Cross-process (artisan worker / separate process):
|    QueryInstrumentation writes to a shared Cache key when no in-process
|    listener exists. This watcher polls that Cache every 3 s and records
|    any entries not yet seen.
|
*/

export interface QueryRecord {
  sql: string;
  bindings?: any[];
  duration: number;
  connection?: string;
  rows?: number;
  error?: string;
}

let activated = false;

export const QueryWatcher = {
  activate(): void {
    if (activated) return;
    activated = true;

    // ── Strategy 1: in-process EventDispatcher ────────────────────────────
    getEventDispatcher().listen("db:query", (payload: any) => {
      TelescopeStore.record(
        "query",
        {
          sql: payload.sql,
          bindings: payload.bindings,
          duration: Math.round(payload.duration ?? 0),
          connection: payload.connection,
          collection: payload.collection,
          rows: payload.rows,
          error: payload.error,
        },
        payload.error ? ["error"] : [],
      );
    });

    // ── Strategy 2: cross-process Cache poll ──────────────────────────────
    const seenIds = new Set<string>();

    const poll = async () => {
      try {
        const { Cache } = require("@/cache");
        const entries: any[] = (await Cache.get(TELESCOPE_QUERY_CACHE_KEY)) ?? [];
        if (!entries.length) return;

        for (const entry of [...entries].reverse()) {
          // oldest first
          if (!entry?.id || seenIds.has(entry.id)) continue;
          seenIds.add(entry.id);

          TelescopeStore.record(
            "query",
            {
              sql: entry.sql,
              bindings: entry.bindings,
              duration: entry.duration,
              connection: entry.connection,
              collection: entry.collection,
              rows: entry.rows,
              error: entry.error,
            },
            entry.error ? ["error"] : [],
          );
        }

        // Prevent the seenIds Set from growing unboundedly
        if (seenIds.size > 2000) {
          const arr = Array.from(seenIds);
          arr.splice(0, 1000);
          seenIds.clear();
          arr.forEach((id) => seenIds.add(id));
        }
      } catch {
        /* best-effort */
      }
    };

    setInterval(poll, 3000);
    poll();
  },

  /** Manual recording for query paths that don't go through the shared instrumentation. */
  record(data: QueryRecord): void {
    TelescopeStore.record(
      "query",
      {
        sql: data.sql,
        bindings: data.bindings,
        duration: Math.round(data.duration),
        connection: data.connection,
        rows: data.rows,
        error: data.error,
      },
      data.error ? ["error"] : [],
    );
  },
};
