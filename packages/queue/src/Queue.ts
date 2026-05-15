import { QueueDriverInterface, FailedJobsInterface, SerializedJob } from "./types.js";
import { SyncDriver, DatabaseDriver, RedisDriver } from "./Drivers/index.js";
import { Job } from "./Job.js";
import queueConfig from "./queue.config.js";
import { Cache } from "@vest-ts/cache";

/*
|--------------------------------------------------------------------------
| Queue Manager
|--------------------------------------------------------------------------
|
| This class manages queue connections and provides a unified interface
| for dispatching jobs to different queue backends.
|
*/

class QueueManager {
  private connections: Map<string, QueueDriverInterface> = new Map();
  private defaultConnection: string;

  constructor() {
    this.defaultConnection = queueConfig.default;
  }

  /*
    |--------------------------------------------------------------------------
    | Connection Management
    |--------------------------------------------------------------------------
    */

  /**
   * Get a queue connection instance.
   * All drivers are cached — database queries are stateless per-call so sharing
   * the driver instance is safe and avoids repeated object allocation on every poll.
   */
  connection(name?: string): QueueDriverInterface {
    const connectionName = name || this.defaultConnection;

    if (!this.connections.has(connectionName)) {
      const config = queueConfig.connections[connectionName];
      if (!config) {
        throw new Error(`Queue connection [${connectionName}] is not defined.`);
      }
      this.connections.set(connectionName, this.resolve(connectionName));
    }

    return this.connections.get(connectionName)!;
  }

  /**
   * Resolve a queue connection instance.
   */
  private resolve(name: string): QueueDriverInterface {
    const config = queueConfig.connections[name];

    if (!config) {
      throw new Error(`Queue connection [${name}] is not defined.`);
    }

    switch (config.driver) {
      case "sync":
        return new SyncDriver();
      case "database":
        return new DatabaseDriver({
          table: config.table,
          queue: config.queue,
          retry_after: config.retry_after,
        });
      case "redis":
        return new RedisDriver({
          queue: config.queue,
          retry_after: config.retry_after,
        });
      default:
        throw new Error(`Queue driver [${config.driver}] is not supported.`);
    }
  }

  /**
   * Get the default connection name.
   */
  getDefaultDriver(): string {
    return this.defaultConnection;
  }

  /**
   * Set the default connection name.
   */
  setDefaultDriver(name: string): void {
    this.defaultConnection = name;
  }

  /*
    |--------------------------------------------------------------------------
    | Queue Operations
    |--------------------------------------------------------------------------
    */

  /**
   * Push a new job onto the queue.
   * Respects uniqueId/uniqueFor — silently deduplicates if a lock already exists.
   */
  async push(job: Job, queue?: string): Promise<string> {
    // Unique job enforcement — single cache read instead of has() + get()
    if (job.uniqueId) {
      const lockKey = `queue:unique:${job.uniqueId}`;
      const existingUuid = await Cache.get(lockKey).catch(() => null);
      if (existingUuid != null) {
        return (existingUuid as string) ?? job.uniqueId;
      }
      const ttl = job.uniqueFor && job.uniqueFor > 0 ? job.uniqueFor : null;
      await Cache.set(lockKey, job.uuid || "pending", ttl).catch(() => {});
    }

    const serialized = job.serialize();
    const connection = this.connection(job.connection);
    const queueName = queue || job.queue;

    if (job.delay > 0) {
      return connection.later(job.delay, serialized, queueName);
    }

    return connection.push(serialized, queueName);
  }

  /**
   * Release the unique lock for a job after it completes or permanently fails.
   */
  async releaseUniqueLock(job: SerializedJob): Promise<void> {
    // uniqueId is stored in the serialized data — access via a type-safe cast
    const uniqueId = (job as any).uniqueId as string | undefined;
    if (uniqueId) {
      await Cache.del(`queue:unique:${uniqueId}`).catch(() => {});
    }
  }

  /**
   * Push a new job onto the queue after a delay.
   */
  async later(delay: number, job: Job, queue?: string): Promise<string> {
    job.withDelay(delay);
    return this.push(job, queue);
  }

  /**
   * Push a raw payload onto the queue.
   */
  async pushRaw(payload: SerializedJob, queue?: string, connection?: string): Promise<string> {
    return this.connection(connection).push(payload, queue);
  }

  /**
   * Push multiple jobs onto the queue.
   */
  async bulk(jobs: Job[], queue?: string): Promise<string[]> {
    return Promise.all(jobs.map((job) => this.push(job, queue)));
  }

  /**
   * Pop the next job from the queue.
   */
  async pop(queue?: string, connection?: string): Promise<SerializedJob | null> {
    return this.connection(connection).pop(queue);
  }

  /**
   * Get the size of the queue.
   */
  async size(queue?: string, connection?: string): Promise<number> {
    return this.connection(connection).size(queue);
  }

  /**
   * Clear all jobs from the queue.
   */
  async clear(queue?: string, connection?: string): Promise<number> {
    return this.connection(connection).clear(queue);
  }

  /**
   * Get all jobs from a queue.
   */
  async getJobs(queue?: string, connection?: string): Promise<SerializedJob[]> {
    return this.connection(connection).getJobs(queue);
  }

  /*
    |--------------------------------------------------------------------------
    | Failed Jobs
    |--------------------------------------------------------------------------
    */

  private asFailedDriver(driver: QueueDriverInterface): FailedJobsInterface | null {
    return "logFailed" in driver ? (driver as unknown as FailedJobsInterface) : null;
  }

  async logFailed(
    connectionName: string,
    queue: string,
    job: SerializedJob,
    exception: Error,
  ): Promise<void> {
    const failed = this.asFailedDriver(this.connection(connectionName));
    if (failed) await failed.logFailed(connectionName, queue, job, exception);
  }

  async getFailedJobs(connection?: string): Promise<any[]> {
    const failed = this.asFailedDriver(this.connection(connection));
    return failed ? failed.getFailedJobs() : [];
  }

  async retryFailed(uuid: string, connection?: string): Promise<boolean> {
    const failed = this.asFailedDriver(this.connection(connection));
    return failed ? failed.retryFailed(uuid) : false;
  }

  async forgetFailed(uuid: string, connection?: string): Promise<boolean> {
    const failed = this.asFailedDriver(this.connection(connection));
    return failed ? failed.forgetFailed(uuid) : false;
  }

  async flushFailed(connection?: string): Promise<number> {
    const failed = this.asFailedDriver(this.connection(connection));
    return failed ? failed.flushFailed() : 0;
  }
}

// Export a singleton instance
export const Queue = new QueueManager();

// Also export the class for testing
export { QueueManager };
