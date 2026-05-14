import { QueueDriverInterface, FailedJobsInterface, SerializedJob } from "../types.js";
import queueConfig from "../queue.config.js";
import QueueJob from "../Queue/QueueJob.js";
import FailedJob from "../Queue/FailedJob.js";

/*
|--------------------------------------------------------------------------
| Database Queue Driver
|--------------------------------------------------------------------------
|
| Stores jobs in a database table. Every state transition uses an explicit
| query-based UPDATE so attempts, reserved_at, available_at, and payload
| are always written — no reliance on ORM dirty-tracking.
|
*/

export class DatabaseDriver implements QueueDriverInterface, FailedJobsInterface {
  private defaultQueue: string;
  private retryAfter: number;

  constructor(config?: { table?: string; queue?: string; retry_after?: number }) {
    const dbConfig = queueConfig.connections.database;
    this.defaultQueue = config?.queue || dbConfig.queue || "default";
    this.retryAfter = config?.retry_after || dbConfig.retry_after || 90;
  }

  async size(queue: string = this.defaultQueue): Promise<number> {
    return await QueueJob.query().where("queue", queue).count();
  }

  async push(job: SerializedJob, queue: string = this.defaultQueue): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const availableAt = Math.floor(job.availableAt / 1000);

    await QueueJob.create({
      uuid: job.uuid,
      queue: queue,
      payload: JSON.stringify(job),
      attempts: 0,
      available_at: availableAt,
      created_at: now,
    });

    return job.id;
  }

  async later(
    delay: number,
    job: SerializedJob,
    queue: string = this.defaultQueue,
  ): Promise<string> {
    job.availableAt = Date.now() + delay * 1000;
    return this.push(job, queue);
  }

  async pop(queue: string = this.defaultQueue): Promise<SerializedJob | null> {
    const now = Math.floor(Date.now() / 1000);
    const expiredReservation = now - this.retryAfter;

    // Fetch next available job (not reserved, or reservation expired)
    const queueJob = await QueueJob.query()
      .where("queue", queue)
      .where(function (q: any) {
        q.whereNull("reserved_at").orWhere("reserved_at", "<", expiredReservation);
      })
      .where("available_at", "<=", now)
      .orderBy("id", "asc")
      .first();

    if (!queueJob) return null;

    // Compute the new attempt count before writing it
    const newAttempts = (queueJob.attempts || 0) + 1;

    // Explicit UPDATE — never relies on ORM dirty-tracking for attempts
    await QueueJob.query().where("id", queueJob.id).update({
      reserved_at: now,
      attempts: newAttempts,
    });

    const job: SerializedJob = JSON.parse(queueJob.payload);
    job.reservedAt = now * 1000;
    job.attempts = newAttempts;

    // Carry the DB row ID privately so release/delete can target it by PK
    (job as any).__dbRowId = queueJob.id;

    return job;
  }

  async delete(job: SerializedJob, _queue: string = this.defaultQueue): Promise<void> {
    const rowId = (job as any).__dbRowId;

    if (rowId != null) {
      await QueueJob.query().where("id", rowId).delete();
    } else {
      await QueueJob.query().where("uuid", job.uuid).delete();
    }
  }

  async release(
    job: SerializedJob,
    delay: number,
    _queue: string = this.defaultQueue,
  ): Promise<void> {
    // availableAt stored as Unix seconds in the DB column
    const availableAt = Math.floor((Date.now() + delay * 1000) / 1000);
    const rowId = (job as any).__dbRowId;

    // Update the SerializedJob object before serialising so the stored payload
    // reflects the latest state (attempts, exceptionCount, availableAt).
    job.availableAt = availableAt * 1000;
    job.reservedAt = null;

    // Strip the private routing key from the payload before writing to DB
    const { __dbRowId: _strip, ...cleanJob } = job as any;
    const payload = JSON.stringify(cleanJob);

    // Explicit UPDATE — always writes reserved_at, available_at, attempts, payload
    if (rowId != null) {
      await QueueJob.query().where("id", rowId).update({
        reserved_at: null,
        available_at: availableAt,
        attempts: job.attempts,
        payload: payload,
      });
    } else {
      await QueueJob.query().where("uuid", job.uuid).update({
        reserved_at: null,
        available_at: availableAt,
        attempts: job.attempts,
        payload: payload,
      });
    }
  }

  async clear(queue: string = this.defaultQueue): Promise<number> {
    const count = await this.size(queue);
    await QueueJob.query().where("queue", queue).delete();
    return count;
  }

  async getJobs(queue: string = this.defaultQueue): Promise<SerializedJob[]> {
    const jobs = await QueueJob.query().where("queue", queue).orderBy("id", "asc").get();
    return jobs.map((job: QueueJob) => JSON.parse(job.payload));
  }

  /*
  |--------------------------------------------------------------------------
  | Failed Jobs Management
  |--------------------------------------------------------------------------
  */

  async logFailed(
    connection: string,
    queue: string,
    job: SerializedJob,
    exception: Error,
  ): Promise<void> {
    // Strip routing metadata from the persisted payload
    const { __dbRowId: _strip, ...cleanJob } = job as any;
    await FailedJob.create({
      uuid: job.uuid,
      connection: connection,
      queue: queue,
      payload: JSON.stringify(cleanJob),
      exception: exception.stack || exception.message,
    });
  }

  async getFailedJobs(): Promise<any[]> {
    const jobs = await FailedJob.query().orderBy("failed_at", "desc").get();
    return jobs.map((job: FailedJob) => job.toJSON());
  }

  async retryFailed(uuid: string): Promise<boolean> {
    const failedJob = await FailedJob.query().where("uuid", uuid).first();
    if (!failedJob) return false;

    const job: SerializedJob = JSON.parse(failedJob.payload);

    // Reset all retry counters
    job.attempts = 0;
    job.exceptionCount = 0;
    job.reservedAt = null;
    job.availableAt = Date.now();

    await this.push(job, failedJob.queue);
    await this.forgetFailed(uuid);

    return true;
  }

  async forgetFailed(uuid: string): Promise<boolean> {
    const deleted = await FailedJob.query().where("uuid", uuid).delete();
    return deleted > 0;
  }

  async flushFailed(): Promise<number> {
    const count = await FailedJob.query().count();
    await FailedJob.query().delete();
    return count;
  }
}
