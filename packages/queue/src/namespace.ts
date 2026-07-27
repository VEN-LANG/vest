import { config } from "@lara-node/core";
import queueConfig from "./queue.config.js";
import type { QueueConfig, QueueConnectionConfig } from "./types.js";

/*
|--------------------------------------------------------------------------
| Queue Namespacing
|--------------------------------------------------------------------------
|
| Every Redis key this package writes — job lists, delayed sets, reserved
| hashes, failed-job hashes, worker restart signals, scheduler locks and the
| maintenance flag — is namespaced by the owning application, so that two
| Lara-Node services pointed at the same Redis instance never see each
| other's keys.
|
| These helpers live here rather than in `queue.config.ts` because that file
| is published into applications with `vendor:publish` — users own and edit
| their copy, so it must stay pure configuration with no behaviour to
| accidentally drift or delete.
|
*/

/**
 * Resolve the effective queue config. Reads the application override
 * registered via `setConfig('queue', …)` (e.g. by the app's
 * ConfigServiceProvider), falling back to this package's bundled default.
 * Always call this instead of importing the constant so app config wins.
 */
export function getQueueConfig(): QueueConfig {
  return config<QueueConfig>("queue", queueConfig);
}

/**
 * The logical name of the current application.
 *
 * Resolution order: `QUEUE_APP` → `APP_NAME` → `"app"`.
 *
 * Set `APP_NAME` per service. Leaving it unset on two services sharing a
 * Redis instance makes both resolve to `"app"` and they WILL collide.
 */
export function appName(): string {
  return process.env.QUEUE_APP || process.env.APP_NAME || "app";
}

/**
 * The key prefix for a named application.
 *
 * Kept as `<app>_queue` — the shape used before prefixes were configurable —
 * so upgrading does not orphan jobs already sitting in Redis.
 */
export function defaultPrefixFor(app: string): string {
  return `${app}_queue`;
}

/**
 * Resolve the Redis key prefix for a queue connection.
 * An explicit `prefix` always wins; otherwise it is derived from `app`.
 */
export function resolvePrefix(connection?: Pick<QueueConnectionConfig, "prefix" | "app">): string {
  if (connection?.prefix) return connection.prefix;
  return defaultPrefixFor(connection?.app || appName());
}

/** A queue name split into its target application and bare queue name. */
export interface ResolvedQueueName {
  /** Bare queue name with any `@app` suffix stripped. */
  queue: string;
  /** Target application, or undefined when the queue belongs to this app. */
  app?: string;
}

/**
 * Parse a possibly app-qualified queue name.
 *
 *   parseQueueName('emails')            → { queue: 'emails' }
 *   parseQueueName('emails@billing')    → { queue: 'emails', app: 'billing' }
 *
 * The `queue@app` form is how a service dispatches onto — or works — another
 * service's queue on a shared Redis instance.
 */
export function parseQueueName(name: string): ResolvedQueueName {
  const at = name.lastIndexOf("@");
  if (at <= 0 || at === name.length - 1) return { queue: name };
  return { queue: name.slice(0, at), app: name.slice(at + 1) };
}

/** Build an app-qualified queue name: `qualifyQueue('emails', 'billing')`. */
export function qualifyQueue(queue: string, app?: string): string {
  return app ? `${queue}@${app}` : queue;
}

/**
 * A key scoped to the current application, used for signals and locks that
 * are not themselves queues (worker restart, scheduler locks, maintenance).
 */
export function appKey(...parts: string[]): string {
  return [appName(), ...parts].join(":");
}
