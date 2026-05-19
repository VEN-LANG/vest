import { Queue } from "./Queue.js";
import { Job } from "./Job.js";
import { SerializedJob, WorkerOptions } from "./types.js";
import queueConfig from "./queue.config.js";
import { Cache } from "@lara-node/cache";
import { EventEmitter } from "events";

/*
|--------------------------------------------------------------------------
| Queue Worker
|--------------------------------------------------------------------------
|
| Processes jobs from the queue. Supports daemon mode and single-run mode.
| Handles retries, backoff, maxExceptions, retryUntil, maintenance mode,
| and graceful restart via cache signal.
|
*/

// Guard so signal handlers are only registered once across all Worker instances
let signalsRegistered = false;

export class Worker extends EventEmitter {
  private running: boolean = false;
  private paused: boolean = false;
  private shouldQuit: boolean = false;
  private jobsProcessed: number = 0;
  private startTime: number = 0;
  private currentJob: SerializedJob | null = null;
  // Throttle expensive per-tick cache checks to every N idle cycles
  private idleTicks: number = 0;
  private static readonly IDLE_CHECK_INTERVAL = 5;

  private connectionName: string;
  private queues: string[];
  private options: Required<Omit<WorkerOptions, "workerId">>;
  /** Horizon worker ID — enables Cache-based control signals from the dashboard. */
  private readonly workerId?: string;

  private readonly restartKey: string;
  private readonly horizonCtrlPrefix: string;

  constructor(
      connectionName?: string,
      queues: string | string[] = "default",
      options: WorkerOptions = {},
  ) {
    super();

    this.connectionName = connectionName || queueConfig.default;
    this.queues = Array.isArray(queues) ? queues : [queues];
    this.restartKey = `${process.env.APP_NAME || "app"}:queue:restart`;
    this.horizonCtrlPrefix = `${process.env.APP_NAME || "app"}:horizon:ctrl`;
    this.workerId = options.workerId;

    this.options = {
      connection: this.connectionName,
      queue: queues,
      delay: options.delay ?? 0,
      memory: options.memory ?? 128,
      timeout: options.timeout ?? queueConfig.defaults.timeout,
      sleep: options.sleep ?? 3,
      maxTries: options.maxTries ?? queueConfig.defaults.tries,
      maxJobs: options.maxJobs ?? 0,
      maxTime: options.maxTime ?? 0,
      force: options.force ?? false,
      stopWhenEmpty: options.stopWhenEmpty ?? false,
      rest: options.rest ?? 0,
      verbose: options.verbose ?? false,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Worker Lifecycle
  |--------------------------------------------------------------------------
  */

  async daemon(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.shouldQuit = false;
    this.startTime = Date.now();
    this.jobsProcessed = 0;

    console.log(
        `[Worker] Starting on connection [${this.connectionName}] processing queues: ${this.queues.join(", ")}`,
    );
    this.emit("worker:start", { connection: this.connectionName, queues: this.queues });

    this.registerSignalHandlers();

    while (this.running && !this.shouldQuit) {
      if (this.paused) {
        await this.sleep(this.options.sleep * 1000);
        continue;
      }

      // Cheap synchronous guards — run every tick
      if (this.options.maxJobs > 0 && this.jobsProcessed >= this.options.maxJobs) {
        console.log(`[Worker] Max jobs (${this.options.maxJobs}) reached, stopping...`);
        this.stop();
        break;
      }

      if (this.options.maxTime > 0) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        if (elapsed >= this.options.maxTime) {
          console.log(`[Worker] Max time (${this.options.maxTime}s) reached, stopping...`);
          this.stop();
          break;
        }
      }

      // Expensive async checks (cache/memory) batched every IDLE_CHECK_INTERVAL idle ticks
      // or always after a job runs (idleTicks reset to 0 after processing).
      if (this.idleTicks % Worker.IDLE_CHECK_INTERVAL === 0) {
        if (this.memoryExceeded()) {
          const memMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
          console.log(`[Worker] Memory limit reached (${memMb} MB / ${this.options.memory} MB) — attempting GC recovery...`);
          // Notify listeners first so they can free disposable memory before GC runs
          this.emit("worker:memory-exceeded", { memoryMb: memMb, limitMb: this.options.memory });
          if (typeof (global as any).gc === "function") (global as any).gc();
          await this.sleep(500);
          if (!this.memoryExceeded()) {
            const recovered = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            console.log(`[Worker] Memory recovered after GC (${recovered} MB), continuing...`);
          } else {
            console.log("[Worker] Memory still exceeded after GC — stopping for supervisor restart.");
            this.stop();
            break;
          }
        }

        // Batch all cache lookups in parallel
        const [inMaintenance, restart, horizonSignal] = await Promise.all([
          this.options.force ? Promise.resolve(false) : this.isInMaintenanceMode(),
          this.shouldRestart(),
          this.checkHorizonSignal(),
        ]);

        // Apply Horizon dashboard control signal if present
        if (horizonSignal === "stop") {
          console.log("[Worker] Horizon stop signal received, stopping...");
          this.stop();
          break;
        }
        if (horizonSignal === "pause" && !this.paused) {
          console.log("[Worker] Horizon pause signal received.");
          this.pause();
        }
        if (horizonSignal === "resume" && this.paused) {
          console.log("[Worker] Horizon resume signal received.");
          this.resume();
        }

        if (restart) {
          console.log("[Worker] Restart signal detected, stopping...");
          this.stop();
          break;
        }

        if (inMaintenance) {
          if (this.options.verbose)
            console.log("[Worker] Application in maintenance mode, sleeping...");
          this.idleTicks++;
          await this.sleep(this.options.sleep * 1000);
          continue;
        }
      }

      const job = await this.getNextJob();

      if (job) {
        this.idleTicks = 0;
        await this.process(job);
        this.jobsProcessed++;

        if (this.options.rest > 0) {
          await this.sleep(this.options.rest * 1000);
        }
      } else {
        if (this.options.stopWhenEmpty) {
          console.log("[Worker] Queue is empty, stopping...");
          this.stop();
          break;
        }
        this.idleTicks++;
        await this.sleep(this.options.sleep * 1000);
      }
    }

    this.emit("worker:stop", {
      connection: this.connectionName,
      jobsProcessed: this.jobsProcessed,
      runtime: (Date.now() - this.startTime) / 1000,
    });

    console.log(`[Worker] Stopped. Processed ${this.jobsProcessed} jobs.`);
  }

  async runNextJob(): Promise<boolean> {
    const job = await this.getNextJob();
    if (!job) return false;
    await this.process(job);
    return true;
  }

  stop(): void {
    this.shouldQuit = true;
    this.running = false;
  }

  pause(): void {
    this.paused = true;
    this.emit("worker:pause");
  }

  resume(): void {
    this.paused = false;
    this.emit("worker:resume");
  }

  /*
  |--------------------------------------------------------------------------
  | Job Processing
  |--------------------------------------------------------------------------
  */

  private async getNextJob(): Promise<SerializedJob | null> {
    for (const queue of this.queues) {
      try {
        if (this.options.verbose) {
          console.log(
              `[Worker] Polling queue [${queue}] on connection [${this.connectionName}]...`,
          );
        }
        const job = await Queue.pop(queue, this.connectionName);
        if (job) return job;
      } catch (error) {
        console.error(`[Worker] Error popping job from queue [${queue}]:`, error);
      }
    }
    if (this.options.verbose) {
      console.log(`[Worker] No jobs found, sleeping for ${this.options.sleep}s...`);
    }
    return null;
  }

  private async process(serializedJob: SerializedJob): Promise<void> {
    this.currentJob = serializedJob;

    this.emit("job:processing", { connectionName: this.connectionName, job: serializedJob });
    console.log(`[Worker] Processing job: ${serializedJob.displayName} (${serializedJob.uuid})`);

    try {
      const job = Job.deserialize(serializedJob);

      if (!job) {
        throw new Error(`Failed to deserialize job: ${serializedJob.job}`);
      }

      const timeoutMs = (serializedJob.timeout || this.options.timeout) * 1000;
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("Job timed out")), timeoutMs);
      });

      try {
        await Promise.race([job.handle(), timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle);
      }

      await this.handleSuccess(serializedJob);
    } catch (error) {
      await this.handleFailure(serializedJob, error as Error);
    } finally {
      this.currentJob = null;
    }
  }

  private async handleSuccess(job: SerializedJob): Promise<void> {
    const driver = Queue.connection(this.connectionName);
    await driver.delete(job, job.queue);

    // Release unique lock so another job with same uniqueId can be dispatched
    await Queue.releaseUniqueLock(job);

    this.emit("job:processed", { connectionName: this.connectionName, job });
    console.log(`[Worker] Job completed: ${job.displayName} (${job.uuid})`);
  }

  private async handleFailure(job: SerializedJob, error: Error): Promise<void> {
    console.error(`[Worker] Job failed: ${job.displayName} (${job.uuid}) — ${error.message}`);

    this.emit("job:exception", { connectionName: this.connectionName, job, exception: error });

    // Increment exception count and persist it into the in-memory job object
    // so it is included in the payload when the job is released back to the queue.
    job.exceptionCount = (job.exceptionCount ?? 0) + 1;

    const maxTries = job.maxTries || this.options.maxTries;
    const maxExceptions = job.maxExceptions ?? queueConfig.defaults.maxExceptions;
    const retryUntilExpired = job.retryUntil != null && Date.now() > job.retryUntil;

    const shouldFailPermanently =
        retryUntilExpired || job.attempts >= maxTries || job.exceptionCount >= maxExceptions;

    const driver = Queue.connection(this.connectionName);

    if (!shouldFailPermanently) {
      const delay = this.calculateBackoff(job);

      console.log(
          `[Worker] Releasing job for retry — attempt ${job.attempts}/${maxTries}, ` +
          `exceptions ${job.exceptionCount}/${maxExceptions}, delay ${delay}s`,
      );

      await driver.release(job, delay, job.queue);
    } else {
      const reason = retryUntilExpired
          ? "retryUntil deadline passed"
          : job.exceptionCount >= maxExceptions
              ? `maxExceptions (${maxExceptions}) reached`
              : `maxTries (${maxTries}) reached`;

      console.log(`[Worker] Job failed permanently after ${job.attempts} attempt(s): ${reason}`);

      await driver.delete(job, job.queue);
      await Queue.logFailed(this.connectionName, job.queue, job, error);

      // Release unique lock on permanent failure too
      await Queue.releaseUniqueLock(job);

      const jobInstance = Job.deserialize(job);
      if (jobInstance) {
        try {
          jobInstance.failed(error);
        } catch (e) {
          console.error("[Worker] Error in job.failed():", e);
        }
      }

      this.emit("job:failed", { connectionName: this.connectionName, job, exception: error });
    }
  }

  private calculateBackoff(job: SerializedJob): number {
    const backoff = job.backoff || queueConfig.defaults.backoff;

    if (typeof backoff === "number") return backoff;

    if (Array.isArray(backoff)) {
      const index = Math.min(job.attempts - 1, backoff.length - 1);
      return backoff[Math.max(0, index)];
    }

    return 0;
  }

  /*
  |--------------------------------------------------------------------------
  | Utilities
  |--------------------------------------------------------------------------
  */

  private memoryExceeded(): boolean {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return used >= this.options.memory;
  }

  private async isInMaintenanceMode(): Promise<boolean> {
    try {
      return await Cache.has(`${process.env.APP_NAME || "app"}:maintenance`);
    } catch {
      return false;
    }
  }

  private async shouldRestart(): Promise<boolean> {
    try {
      const restartTs = await Cache.get(this.restartKey);
      return restartTs != null && Number(restartTs) > this.startTime;
    } catch {
      return false;
    }
  }

  /** Read and immediately clear a Horizon dashboard control signal for this worker. */
  private async checkHorizonSignal(): Promise<"pause" | "resume" | "stop" | null> {
    if (!this.workerId) return null;
    const key = `${this.horizonCtrlPrefix}:${this.workerId}`;
    try {
      const sig = await Cache.get(key);
      if (sig) await Cache.del(key);
      return (sig as "pause" | "resume" | "stop" | null) ?? null;
    } catch {
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private registerSignalHandlers(): void {
    if (signalsRegistered) return;
    signalsRegistered = true;

    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT"];
    for (const signal of signals) {
      process.on(signal, () => {
        console.log(`\n[Worker] Received ${signal}, stopping gracefully...`);
        this.stop();
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Status
  |--------------------------------------------------------------------------
  */

  isRunning(): boolean {
    return this.running;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getJobsProcessed(): number {
    return this.jobsProcessed;
  }

  getCurrentJob(): SerializedJob | null {
    return this.currentJob;
  }

  getRuntime(): number {
    return this.startTime > 0 ? (Date.now() - this.startTime) / 1000 : 0;
  }

  getStatus(): {
    running: boolean;
    paused: boolean;
    jobsProcessed: number;
    runtime: number;
    currentJob: SerializedJob | null;
    memory: number;
  } {
    return {
      running: this.running,
      paused: this.paused,
      jobsProcessed: this.jobsProcessed,
      runtime: this.getRuntime(),
      currentJob: this.currentJob,
      memory: process.memoryUsage().heapUsed / 1024 / 1024,
    };
  }
}
