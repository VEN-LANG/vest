/*
|--------------------------------------------------------------------------
| Queue Types and Interfaces
|--------------------------------------------------------------------------
|
| This file contains all the type definitions for the queue system.
|
*/

/*
|--------------------------------------------------------------------------
| Queue Configuration
|--------------------------------------------------------------------------
|
| These live here rather than beside the config values, because
| `queue.config.ts` is published into applications with `vendor:publish` —
| users own and edit their copy, so it holds data only.
|
*/

export interface QueueConnectionConfig {
  driver: "sync" | "database" | "redis";
  table?: string;
  queue?: string;
  retry_after?: number;
  connection?: string;

  /*
  |--------------------------------------------------------------------------
  | Redis key namespacing
  |--------------------------------------------------------------------------
  |
  | When several applications share one Redis instance, every application
  | must write its jobs under its own key prefix — otherwise worker A happily
  | pops jobs pushed by application B and fails to resolve the job class.
  |
  | `prefix` is the literal key prefix for this connection. When omitted it is
  | derived from `app`, which itself defaults to QUEUE_APP / APP_NAME.
  |
  */

  /** Logical application name owning this connection. Defaults to APP_NAME. */
  app?: string;

  /** Literal Redis key prefix. Defaults to `<app>_queue`. */
  prefix?: string;

  /**
   * Sibling applications sharing this Redis instance, mapped to their key
   * prefix. Lets this app address another app's queues with `queue@app`
   * without guessing at their prefix shape.
   *
   *   apps: { billing: 'billing_queue', search: 'search-jobs' }
   *   Queue.push(job, 'invoices@billing')
   *
   * Unlisted names fall back to the default `<app>_queue` shape.
   */
  apps?: Record<string, string>;

  /*
  |--------------------------------------------------------------------------
  | Redis connection settings
  |--------------------------------------------------------------------------
  | All optional — each falls back to the matching REDIS_* environment
  | variable so existing .env-only setups keep working untouched.
  */
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  username?: string;
  database?: number;
}

export interface QueueConfig {
  default: string;
  connections: Record<string, QueueConnectionConfig>;
  failed: { driver: "database"; table: string };
  defaults: { tries: number; timeout: number; backoff: number | number[]; maxExceptions: number };
}

export interface SerializedJob {
  id: string;
  uuid: string;
  displayName: string;
  job: string; // Job class name
  data: string; // JSON serialized payload (may be encrypted)
  queue: string;
  attempts: number;
  maxTries: number;
  maxExceptions: number;
  exceptionCount: number;
  timeout: number;
  backoff: number | number[];
  retryUntil: number | null;
  encrypted: boolean;
  createdAt: number;
  availableAt: number;
  reservedAt: number | null;
}

export interface FailedJob {
  id: number;
  uuid: string;
  connection: string;
  queue: string;
  payload: string;
  exception: string;
  failedAt: Date;
}

export interface QueueDriverInterface {
  size(queue?: string): Promise<number>;
  push(job: SerializedJob, queue?: string): Promise<string>;
  later(delay: number, job: SerializedJob, queue?: string): Promise<string>;
  pop(queue?: string): Promise<SerializedJob | null>;
  delete(job: SerializedJob, queue?: string): Promise<void>;
  release(job: SerializedJob, delay: number, queue?: string): Promise<void>;
  clear(queue?: string): Promise<number>;
  getJobs(queue?: string): Promise<SerializedJob[]>;
}

export interface FailedJobsInterface {
  logFailed(connection: string, queue: string, job: SerializedJob, exception: Error): Promise<void>;
  getFailedJobs(): Promise<any[]>;
  retryFailed(uuid: string): Promise<boolean>;
  forgetFailed(uuid: string): Promise<boolean>;
  flushFailed(): Promise<number>;
}

export interface JobOptions {
  queue?: string;
  connection?: string;
  delay?: number;
  tries?: number;
  timeout?: number;
  backoff?: number | number[];
  retryUntil?: Date;
  uniqueId?: string;
  uniqueFor?: number;
}

export interface ScheduleFrequency {
  expression: string;
  timezone?: string;
}

export interface ScheduledTask {
  name: string;
  command: string | (() => Promise<void>);
  frequency: ScheduleFrequency;
  description?: string;
  withoutOverlapping?: boolean;
  onOneServer?: boolean;
  evenInMaintenanceMode?: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "released";

export interface WorkerOptions {
  connection?: string;
  queue?: string | string[];
  delay?: number;
  memory?: number;
  timeout?: number;
  sleep?: number;
  maxTries?: number;
  maxJobs?: number;
  maxTime?: number;
  force?: boolean;
  stopWhenEmpty?: boolean;
  rest?: number;
  verbose?: boolean;
  /** Horizon worker ID — enables Cache-based pause/resume/stop signals from the dashboard. */
  workerId?: string;
}

export interface JobEvent {
  connectionName: string;
  job: SerializedJob;
}

export interface JobProcessingEvent extends JobEvent {}

export interface JobProcessedEvent extends JobEvent {}

export interface JobFailedEvent extends JobEvent {
  exception: Error;
}

export interface JobExceptionOccurredEvent extends JobEvent {
  exception: Error;
}
