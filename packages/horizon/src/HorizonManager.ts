import { Worker } from "@lara-node/queue";
import { scheduler } from "@lara-node/queue";
import { Queue } from "@lara-node/queue";
import { horizonMetrics, writeHorizonSignal } from "./HorizonMetrics.js";
import type { SchedulerTaskInfo } from "./HorizonMetrics.js";
import { WorkerOptions } from "@lara-node/queue";
import { getEventDispatcher } from "@lara-node/events";
import { queueConfig } from "@lara-node/queue";

/*
|--------------------------------------------------------------------------
| Horizon Manager
|--------------------------------------------------------------------------
|
| Owns Worker instances. Job lifecycle events are written to:
|   1. HorizonMetrics Cache — for cross-process dashboard visibility.
|   2. Application EventDispatcher — for in-process Telescope/user listeners.
|
| Worker control (pause/resume/stop) always writes a Cache signal so the
| artisan worker process picks it up on its next idle check.
|
| workerDefs are persisted to cache so the dashboard can list and restart
| workers even across process boundaries.
|
*/

export interface WorkerDefinition {
  id: string;
  connection?: string;
  queues?: string | string[];
  options?: WorkerOptions;
}

class HorizonManagerClass {
  private workers = new Map<string, { worker: Worker; startedAt: Date }>();
  /** Persists the original WorkerDefinition so a worker can be restarted after a memory cycle. */
  private workerDefs = new Map<string, WorkerDefinition>();

  /*
    |--------------------------------------------------------------------------
    | Worker Lifecycle
    |--------------------------------------------------------------------------
    */

  startWorker(def: WorkerDefinition): string {
    const { id, connection, queues = "default", options = {} } = def;
    const worker = new Worker(connection, queues, { ...options, workerId: id });
    const startedAt = new Date();
    this.workers.set(id, { worker, startedAt });
    this.workerDefs.set(id, def);
    this.persistWorkerDefs();

    let jobStartTime = 0;
    let stoppedByMemory = false;

    worker.on("worker:start", ({ connection: conn, queues: qs }) => {
      horizonMetrics
        .registerWorker(id, {
          connection: conn,
          queues: qs,
          status: "running",
          jobsProcessed: 0,
          currentJob: null,
          memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
          runtimeSeconds: 0,
          startedAt,
          lastRun: null,
          nextRun: null,
          pid: process.pid,
        })
        .catch(() => {});
    });

    worker.on("job:processing", ({ job }) => {
      jobStartTime = Date.now();
      horizonMetrics
        .updateWorker(id, {
          currentJob: job,
          memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
          runtimeSeconds: worker.getRuntime(),
        })
        .catch(() => {});
      getEventDispatcher().dispatchNow("horizon:job.processing", { workerId: id, job });
    });

    worker.on("job:processed", ({ job }) => {
      const durationMs = jobStartTime ? Date.now() - jobStartTime : 0;
      const conn = connection || queueConfig.default;
      horizonMetrics
        .updateWorker(id, {
          jobsProcessed: worker.getJobsProcessed(),
          currentJob: null,
          memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
          runtimeSeconds: worker.getRuntime(),
          lastRun: new Date(),
        })
        .catch(() => {});
      horizonMetrics
        .recordJob({
          uuid: job.uuid,
          displayName: job.displayName,
          queue: job.queue,
          connection: conn,
          completedAt: new Date(),
          durationMs,
          status: "processed",
        })
        .catch(() => {});
      getEventDispatcher().dispatchNow("horizon:job.processed", {
        workerId: id,
        job,
        durationMs,
        connection: conn,
      });
    });

    worker.on("job:failed", ({ job, exception }) => {
      const durationMs = jobStartTime ? Date.now() - jobStartTime : 0;
      const conn = connection || queueConfig.default;
      horizonMetrics
        .updateWorker(id, {
          currentJob: null,
          memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
          runtimeSeconds: worker.getRuntime(),
          lastRun: new Date(),
        })
        .catch(() => {});
      horizonMetrics
        .recordJob({
          uuid: job.uuid,
          displayName: job.displayName,
          queue: job.queue,
          connection: conn,
          completedAt: new Date(),
          durationMs,
          status: "failed",
          exception: exception.message,
        })
        .catch(() => {});
      getEventDispatcher().dispatchNow("horizon:job.failed", {
        workerId: id,
        job,
        durationMs,
        connection: conn,
        exception: exception.message,
      });
    });

    worker.on("worker:pause", () =>
      horizonMetrics.updateWorker(id, { status: "paused" }).catch(() => {}),
    );
    worker.on("worker:resume", () =>
      horizonMetrics.updateWorker(id, { status: "running" }).catch(() => {}),
    );
    worker.on("worker:stop", () => {
      horizonMetrics.updateWorker(id, { status: "stopped" }).catch(() => {});
      clearInterval(heartbeat);

      // Memory-exceeded stops require a full process restart to clear the heap.
      // In-process restart reuses the same heap and will immediately trip the limit again.
      if (stoppedByMemory) {
        console.log(
          `[Horizon] Worker ${id} exiting process for clean memory restart — supervisor will restart.`,
        );
        process.exit(1);
      }

      // If still in the workers map, the stop was self-initiated (queue:restart signal,
      // stopWhenEmpty, etc.) — auto-restart in-process after a short delay.
      // stopWorker() removes from the map BEFORE calling worker.stop(), so explicit
      // stops never reach this branch.
      if (this.workers.has(id)) {
        this.workers.delete(id);
        const savedDef = this.workerDefs.get(id);
        if (savedDef) {
          console.log(`[Horizon] Worker ${id} stopped — restarting in 2 s...`);
          horizonMetrics.updateWorker(id, { nextRun: new Date(Date.now() + 2000) }).catch(() => {});
          setTimeout(() => this.startWorker(savedDef), 2000);
        }
      }
    });

    worker.on(
      "worker:memory-exceeded",
      ({ memoryMb, limitMb }: { memoryMb: number; limitMb: number }) => {
        stoppedByMemory = true;
        console.log(
          `[Horizon] Worker ${id} hit memory limit (${memoryMb}/${limitMb} MB) — ` +
            `restarting process...`,
        );
      },
    );

    // Heartbeat — refreshes both the worker snapshot TTL AND the IDs list
    // so neither ever silently expires while the worker is running.
    const heartbeat = setInterval(() => {
      if (!worker.isRunning()) {
        clearInterval(heartbeat);
        return;
      }
      horizonMetrics
        .keepAlive(id, {
          memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
          runtimeSeconds: worker.getRuntime(),
          jobsProcessed: worker.getJobsProcessed(),
        })
        .catch(() => {});
    }, 20_000);

    worker.daemon().catch(console.error);
    return id;
  }

  /*
    |--------------------------------------------------------------------------
    | Worker Control — writes Cache signals so out-of-process workers respond
    |--------------------------------------------------------------------------
    */

  pauseWorker(id: string): boolean {
    const w = this.workers.get(id);
    if (w) w.worker.pause();
    writeHorizonSignal(id, "pause").catch(() => {});
    return true;
  }

  resumeWorker(id: string): boolean {
    const w = this.workers.get(id);
    if (w) {
      w.worker.resume();
      writeHorizonSignal(id, "resume").catch(() => {});
    } else {
      const def = this.workerDefs.get(id);
      if (def) {
        console.log(`[Horizon] Restarting stopped worker ${id}...`);
        this.startWorker(def);
      } else {
        return false;
      }
    }
    return true;
  }

  stopWorker(id: string): boolean {
    const entry = this.workers.get(id);
    if (entry) {
      this.workers.delete(id);
      entry.worker.stop();
      horizonMetrics.removeWorker(id).catch(() => {});
    }
    writeHorizonSignal(id, "stop").catch(() => {});
    return true;
  }

  /*
    |--------------------------------------------------------------------------
    | Worker Definitions — persisted to cache for cross-process visibility
    |--------------------------------------------------------------------------
    */

  private persistWorkerDefs(): void {
    horizonMetrics.writeWorkerDefs(Array.from(this.workerDefs.values())).catch(() => {});
  }

  async getWorkerDefs(): Promise<WorkerDefinition[]> {
    const local = Array.from(this.workerDefs.values());
    if (local.length > 0) return local;
    return horizonMetrics.readWorkerDefs();
  }

  /*
    |--------------------------------------------------------------------------
    | Scheduler — cross-process via cache
    |--------------------------------------------------------------------------
    */

  private schedulerEventsRegistered = false;

  /**
   * Wire scheduler task lifecycle events into Horizon. Mirrors the worker
   * event pattern: each event (1) persists runtime state to the shared cache
   * for cross-process dashboard visibility, and (2) is re-published on the
   * application EventDispatcher for in-process listeners. Idempotent, so it is
   * safe to call from every process that boots Horizon — it only does useful
   * work in the process actually running the scheduler (`schedule:work`).
   */
  registerSchedulerEvents(): void {
    if (this.schedulerEventsRegistered) return;
    this.schedulerEventsRegistered = true;

    const dispatcher = getEventDispatcher();
    const runTimes = new Map<string, number>();

    // Seed task definitions so the dashboard has rows before the first run.
    const defs = scheduler.getTasks().map((t) => ({
      name: t.name,
      expression: t.expression,
      description: t.description,
      isRunning: t.isRunning,
      lastRun: t.lastRun ?? null,
      nextRun: t.nextRun ?? null,
    }));
    if (defs.length > 0) horizonMetrics.writeSchedulerTasks(defs).catch(() => {});

    scheduler.on("task:start", (task) => {
      runTimes.set(task.name, Date.now());
      horizonMetrics
        .updateSchedulerTask(task.name, { isRunning: true, nextRun: task.nextRun })
        .catch(() => {});
      dispatcher.dispatchNow("horizon:schedule.task.start", { task });
    });

    scheduler.on("task:success", (task) => {
      const started = runTimes.get(task.name);
      const durationMs = started ? Date.now() - started : undefined;
      runTimes.delete(task.name);
      horizonMetrics
        .updateSchedulerTask(task.name, {
          isRunning: false,
          lastRun: task.lastRun,
          nextRun: task.nextRun,
        })
        .catch(() => {});
      dispatcher.dispatchNow("horizon:schedule.task.success", { task, durationMs });
    });

    scheduler.on("task:failed", (task, error) => {
      const started = runTimes.get(task.name);
      const durationMs = started ? Date.now() - started : undefined;
      runTimes.delete(task.name);
      horizonMetrics
        .updateSchedulerTask(task.name, {
          isRunning: false,
          lastRun: task.lastRun,
          nextRun: task.nextRun,
        })
        .catch(() => {});
      dispatcher.dispatchNow("horizon:schedule.task.failed", {
        task,
        durationMs,
        error: error?.message ?? String(error),
      });
    });
  }

  async getSchedulerTasks(): Promise<SchedulerTaskInfo[]> {
    const persisted = await horizonMetrics.readSchedulerTasks();
    const local = scheduler.getTasks();

    // Dashboard process without a local scheduler — cache is the only source.
    if (local.length === 0) return persisted;

    // This process owns the task definitions; overlay the event-driven runtime
    // state (isRunning/lastRun/nextRun) persisted by the listener, which may
    // run in another process (schedule:work).
    const byName = new Map(persisted.map((t) => [t.name, t]));
    return local.map((t) => {
      const p = byName.get(t.name);
      return {
        name: t.name,
        expression: t.expression,
        description: t.description,
        isRunning: p?.isRunning ?? t.isRunning,
        lastRun: this.latestDate(t.lastRun, p?.lastRun),
        nextRun: t.nextRun ?? p?.nextRun ?? null,
      };
    });
  }

  /** Return the more recent of two optional dates (cache values may be ISO strings). */
  private latestDate(a?: Date | null, b?: Date | null): Date | null {
    const ta = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY;
    const tb = b ? new Date(b).getTime() : Number.NEGATIVE_INFINITY;
    if (ta === Number.NEGATIVE_INFINITY && tb === Number.NEGATIVE_INFINITY) return null;
    return new Date(Math.max(ta, tb));
  }

  /*
    |--------------------------------------------------------------------------
    | Scheduler — run a task immediately by name
    |--------------------------------------------------------------------------
    */

  async runSchedulerTask(name: string): Promise<boolean> {
    const local = scheduler.getTasks().find((t) => t.name === name);
    if (local) return scheduler.runNow(name);
    // Cross-process: can't run tasks registered in another process
    return false;
  }

  /*
    |--------------------------------------------------------------------------
    | Queue — pending jobs and purge
    |--------------------------------------------------------------------------
    */

  async getQueueJobs(queue: string, connection?: string): Promise<any[]> {
    try {
      return await Queue.getJobs(queue, connection);
    } catch {
      return [];
    }
  }

  async purgeQueue(queue: string, connection?: string): Promise<number> {
    try {
      return await Queue.clear(queue, connection);
    } catch {
      return 0;
    }
  }

  /*
    |--------------------------------------------------------------------------
    | Queue sizes
    |--------------------------------------------------------------------------
    */

  async getQueueSizes(): Promise<Record<string, number>> {
    const queues = new Set<string>(["default"]);
    for (const conn of Object.values(queueConfig.connections)) {
      if (conn.queue) {
        const qs = Array.isArray(conn.queue) ? conn.queue : [conn.queue];
        qs.forEach((q) => queues.add(q));
      }
    }
    const activeWorkers = await horizonMetrics.getWorkers();
    activeWorkers.forEach((w) => w.queues.forEach((q) => queues.add(q)));

    const result: Record<string, number> = {};
    await Promise.all(
      Array.from(queues).map(async (q) => {
        try {
          result[q] = await Queue.size(q);
        } catch {
          result[q] = 0;
        }
      }),
    );
    return result;
  }

  /*
    |--------------------------------------------------------------------------
    | Failed jobs
    |--------------------------------------------------------------------------
    */

  async getFailedJobs(): Promise<any[]> {
    try {
      return await Queue.getFailedJobs();
    } catch {
      return [];
    }
  }

  retryFailed(uuid: string) {
    return Queue.retryFailed(uuid);
  }

  forgetFailed(uuid: string) {
    return Queue.forgetFailed(uuid);
  }

  async flushFailed(): Promise<number> {
    return Queue.flushFailed();
  }
}

export const HorizonManager = new HorizonManagerClass();
