import { QueueDriverInterface, SerializedJob } from "../types.js";
import queueConfig from "../queue.config.js";

/*
|--------------------------------------------------------------------------
| Sync Queue Driver
|--------------------------------------------------------------------------
|
| Executes jobs synchronously — useful for local development or testing.
| Respects maxTries and backoff; retries happen inline without real delays.
|
*/

export class SyncDriver implements QueueDriverInterface {
  private jobs: Map<string, SerializedJob[]> = new Map();

  async size(queue: string = "default"): Promise<number> {
    return this.jobs.get(queue)?.length ?? 0;
  }

  async push(job: SerializedJob, queue: string = "default"): Promise<string> {
    if (!this.jobs.has(queue)) this.jobs.set(queue, []);

    const { Job: JobBase } = await import("../Job.js");

    const maxTries = job.maxTries || queueConfig.defaults.tries;
    const maxExceptions = job.maxExceptions ?? queueConfig.defaults.maxExceptions;

    let lastError: Error | null = null;

    while (job.attempts < maxTries && (job.exceptionCount ?? 0) < maxExceptions) {
      job.attempts += 1;
      job.exceptionCount = job.exceptionCount ?? 0;

      const instance = JobBase.deserialize(job);
      if (!instance) break;

      try {
        await instance.handle();
        // Success — stop retrying
        return job.id;
      } catch (error) {
        lastError = error as Error;
        job.exceptionCount += 1;

        const shouldRetry = job.attempts < maxTries && job.exceptionCount < maxExceptions;

        if (!shouldRetry) break;

        // Sync driver: no real delay between retries
        console.warn(
          `[Sync] Job ${job.displayName} failed (attempt ${job.attempts}/${maxTries}), retrying...`,
        );
      }
    }

    // Permanent failure
    if (lastError) {
      console.error(
        `[Sync] Job ${job.displayName} failed permanently after ${job.attempts} attempt(s):`,
        lastError.message,
      );
      const instance = JobBase.deserialize(job);
      if (instance) {
        try {
          instance.failed(lastError);
        } catch {
          // swallow errors from failed()
        }
      }
      throw lastError;
    }

    return job.id;
  }

  async later(delay: number, job: SerializedJob, queue: string = "default"): Promise<string> {
    // Fire-and-forget — does not block the caller
    setTimeout(() => {
      this.push(job, queue).catch((err) => {
        console.error(`[Sync] Delayed job ${job.displayName} failed:`, err);
      });
    }, delay * 1000);
    return job.id;
  }

  async pop(queue: string = "default"): Promise<SerializedJob | null> {
    const jobs = this.jobs.get(queue);
    if (!jobs || jobs.length === 0) return null;
    return jobs.shift() ?? null;
  }

  async delete(job: SerializedJob, queue: string = "default"): Promise<void> {
    const jobs = this.jobs.get(queue);
    if (jobs) {
      const index = jobs.findIndex((j) => j.id === job.id);
      if (index > -1) jobs.splice(index, 1);
    }
  }

  async release(job: SerializedJob, delay: number, queue: string = "default"): Promise<void> {
    job.availableAt = Date.now() + delay * 1000;
    job.reservedAt = null;
    if (!this.jobs.has(queue)) this.jobs.set(queue, []);
    this.jobs.get(queue)!.push(job);
  }

  async clear(queue: string = "default"): Promise<number> {
    const count = this.jobs.get(queue)?.length ?? 0;
    this.jobs.set(queue, []);
    return count;
  }

  async getJobs(queue: string = "default"): Promise<SerializedJob[]> {
    return this.jobs.get(queue) ?? [];
  }
}
