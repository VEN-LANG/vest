import type { QueueConfig } from "@lara-node/queue";

/*
|--------------------------------------------------------------------------
| Queue Configuration
|--------------------------------------------------------------------------
|
| Default values only — this file is yours to edit. Types and behaviour stay
| in @lara-node/queue so that changing this file can never break them.
|
| ── Sharing one Redis instance between services ──────────────────────────
|
| Every Redis key is namespaced by `app` (or an explicit `prefix`). Two
| services pointed at the same Redis MUST use different app names, or each
| one's worker will pop the other's jobs and fail to resolve the job class.
| Setting APP_NAME per service is enough.
|
| To address another service's queue on purpose, use the `queue@app` form:
|
|   Queue.push(job, 'invoices@billing');
|   pnpm artisan queue:work redis --queue=invoices@billing
|
| List a sibling under `apps` only when its prefix is not the default
| `<app>_queue` shape.
|
*/

const queueConfig: QueueConfig = {
  default: process.env.QUEUE_CONNECTION ?? "sync",
  connections: {
    sync: { driver: "sync" },
    database: { driver: "database", table: "jobs", queue: "default", retry_after: 90 },
    redis: {
      driver: "redis",
      connection: process.env.REDIS_QUEUE_CONNECTION ?? "default",
      queue: process.env.REDIS_QUEUE ?? "default",
      retry_after: 90,

      // Key namespacing — keep unique per service.
      app: process.env.QUEUE_APP ?? process.env.APP_NAME ?? "app",
      prefix: process.env.REDIS_PREFIX ?? undefined,

      // Sibling services on this Redis whose prefix is not '<app>_queue', e.g.
      //   apps: { billing: 'billing_queue', search: 'search-jobs' },
      apps: {},

      // Connection — omit to fall back to the REDIS_* env vars.
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      database: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined,
    },
  },
  failed: { driver: "database", table: "failed_jobs" },
  defaults: { tries: 3, timeout: 60, backoff: [1, 5, 10], maxExceptions: 1 },
};

export const QUEUE_CONNECTION = queueConfig.default;
export default queueConfig;
