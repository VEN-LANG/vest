import { config } from "@lara-node/core";

export interface QueueConnectionConfig {
  driver: "sync" | "database" | "redis";
  table?: string;
  queue?: string;
  retry_after?: number;
  connection?: string;
}

export interface QueueConfig {
  default: string;
  connections: Record<string, QueueConnectionConfig>;
  failed: { driver: "database"; table: string };
  defaults: { tries: number; timeout: number; backoff: number | number[]; maxExceptions: number };
}

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
    },
  },
  failed: { driver: "database", table: "failed_jobs" },
  defaults: { tries: 3, timeout: 60, backoff: [1, 5, 10], maxExceptions: 1 },
};

export const QUEUE_CONNECTION = queueConfig.default;
export default queueConfig;

/**
 * Resolve the effective queue config. Reads the application override
 * registered via `setConfig('queue', …)` (e.g. by the app's
 * ConfigServiceProvider), falling back to this package's bundled default.
 * Always call this instead of importing the constant so app config wins.
 */
export function getQueueConfig(): QueueConfig {
  return config<QueueConfig>("queue", queueConfig);
}
