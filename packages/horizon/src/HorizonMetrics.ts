import { Cache } from "@lara-node/cache";
import type { SerializedJob } from "@lara-node/queue";

/*
|--------------------------------------------------------------------------
| Horizon Metrics Store — Cache-backed, cross-process
|--------------------------------------------------------------------------
|
| Key layout (app prefix is added by the Cache module automatically):
|
|   horizon:wids          → string[]           worker IDs — NO TTL (persistent)
|   horizon:w:{id}        → WorkerSnapshot     90 s TTL, refreshed every 20 s
|   horizon:jobs          → CompletedJobRecord[] ring buffer, 24 h TTL
|   horizon:throughput    → number[]           processed timestamps, 120 s TTL
|   horizon:ctrl:{id}     → string             control signal, 30 s TTL
|   horizon:wdefs         → WorkerDefinition[] saved worker definitions, NO TTL
|   horizon:scheduler     → SchedulerTaskInfo[] scheduler task snapshots, 5-min TTL
|   horizon:mb:{ts}       → JobMinuteBucket    per-minute chart bucket, 2-h TTL
|
| All job/throughput data is written directly to cache — no in-process arrays.
| This keeps heap footprint constant regardless of job volume and survives
| process restarts cleanly.
|
| Worker snapshots still use a localWorkers Map as the authoritative source
| inside the worker process (to avoid round-trip latency on rapid updates).
|
*/
export interface CompletedJobRecord {
  uuid: string;
  displayName: string;
  queue: string;
  connection: string;
  completedAt: Date;
  durationMs: number;
  status: "processed" | "failed";
  exception?: string;
}

export interface WorkerSnapshot {
  id: string;
  connection: string;
  queues: string[];
  status: "running" | "paused" | "stopped";
  jobsProcessed: number;
  currentJob: SerializedJob | null;
  memoryMb: number;
  runtimeSeconds: number;
  startedAt: Date | null;
  lastRun: Date | null;
  nextRun: Date | null;
  pid: number;
}

export interface SchedulerTaskInfo {
  name: string;
  expression: string;
  description?: string;
  isRunning: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
}

const WORKER_TTL = 90; // seconds — individual snapshot TTL (refreshed by heartbeat)
const JOBS_LIMIT = 500;
const SCHEDULER_TTL = 300; // 5 minutes — refreshed on every task run

/** Per-minute aggregation bucket for throughput and duration charts. */
export interface JobMinuteBucket {
  ts: number; // minute start timestamp (ms, floor to minute)
  processed: number;
  failed: number;
  totalMs: number; // sum of durations (for avg)
  maxMs: number; // max single-job duration
}

const appName = () => process.env.APP_NAME || "app";

const K = {
  wids: "horizon:wids",
  worker: (id: string) => `horizon:w:${id}`,
  jobs: "horizon:jobs",
  throughput: "horizon:throughput",
  wdefs: "horizon:wdefs",
  scheduler: "horizon:scheduler",
  // Must include the APP_NAME segment so the key matches what Worker.checkHorizonSignal
  // constructs (it manually prepends "${APP_NAME}:horizon:ctrl" before calling Cache,
  // and Cache then adds its own CACHE_PREFIX on top of both).
  ctrl: (id: string) => `${appName()}:horizon:ctrl:${id}`,
};

class HorizonMetricsStore {
  /** In-process worker cache — authoritative in the worker process. */
  private localWorkers = new Map<string, WorkerSnapshot>();

  /*
  |--------------------------------------------------------------------------
  | Write operations — called from the artisan/worker process
  |--------------------------------------------------------------------------
  */

  async registerWorker(id: string, data: Omit<WorkerSnapshot, "id">): Promise<void> {
    const snap: WorkerSnapshot = { id, ...data };
    this.localWorkers.set(id, snap);
    try {
      await Cache.set(K.worker(id), snap, WORKER_TTL);
      const ids: string[] = (await Cache.get(K.wids)) ?? [];
      if (!ids.includes(id)) ids.push(id);
      await Cache.set(K.wids, ids, null);
    } catch {
      /* metrics are best-effort */
    }
  }

  /**
   * Update a subset of fields in an existing worker snapshot.
   * Only updates the in-process Map and the individual snapshot key.
   * Use keepAlive() from the heartbeat to also refresh the IDs list.
   */
  async updateWorker(id: string, patch: Partial<WorkerSnapshot>): Promise<void> {
    const local = this.localWorkers.get(id);
    if (!local) return;
    const updated = { ...local, ...patch };
    this.localWorkers.set(id, updated);
    Cache.set(K.worker(id), updated, WORKER_TTL).catch(() => {});
  }

  /**
   * Heartbeat — called every 20 s. Refreshes both the snapshot TTL and the
   * IDs list so neither expires while the worker is running.
   */
  async keepAlive(id: string, patch: Partial<WorkerSnapshot>): Promise<void> {
    const local = this.localWorkers.get(id);
    if (!local) return;
    const updated = { ...local, ...patch };
    this.localWorkers.set(id, updated);
    try {
      await Cache.set(K.worker(id), updated, WORKER_TTL);
      const ids: string[] = (await Cache.get(K.wids)) ?? [];
      if (!ids.includes(id)) ids.push(id);
      await Cache.set(K.wids, ids, null);
    } catch {}
  }

  async removeWorker(id: string): Promise<void> {
    this.localWorkers.delete(id);
    try {
      await Cache.del(K.worker(id));
      const ids: string[] = (await Cache.get(K.wids)) ?? [];
      await Cache.set(
        K.wids,
        ids.filter((x) => x !== id),
        null,
      );
    } catch {}
  }

  /**
   * Record a completed job directly to cache. No in-process array — heap
   * footprint stays constant regardless of job volume.
   */
  async recordJob(record: CompletedJobRecord): Promise<void> {
    try {
      const jobs: CompletedJobRecord[] = (await Cache.get(K.jobs)) ?? [];
      jobs.unshift(record);
      if (jobs.length > JOBS_LIMIT) jobs.pop();
      await Cache.set(K.jobs, jobs, 86400);

      if (record.status === "processed") {
        const cutoff = Date.now() - 60_000;
        const ts: number[] = (await Cache.get(K.throughput)) ?? [];
        ts.push(Date.now());
        await Cache.set(
          K.throughput,
          ts.filter((t) => t > cutoff),
          120,
        );
      }

      await this.updateMinuteBucket(record);
    } catch {}
  }

  private async updateMinuteBucket(record: CompletedJobRecord): Promise<void> {
    const minuteTs = Math.floor(Date.now() / 60_000) * 60_000;
    const key = `horizon:mb:${minuteTs}`;
    try {
      const b: JobMinuteBucket = (await Cache.get(key)) ?? {
        ts: minuteTs,
        processed: 0,
        failed: 0,
        totalMs: 0,
        maxMs: 0,
      };
      if (record.status === "processed") {
        b.processed++;
        b.totalMs += record.durationMs;
        b.maxMs = Math.max(b.maxMs, record.durationMs);
      } else {
        b.failed++;
      }
      await Cache.set(key, b, 7200);
    } catch {}
  }

  /** Returns per-minute aggregation buckets for the last `minutes` minutes. */
  async getMetrics(minutes = 60): Promise<JobMinuteBucket[]> {
    const currentMinute = Math.floor(Date.now() / 60_000) * 60_000;
    return Promise.all(
      Array.from({ length: minutes }, async (_, i) => {
        const ts = currentMinute - (minutes - 1 - i) * 60_000;
        const b: JobMinuteBucket | null = await Cache.get(`horizon:mb:${ts}`).catch(() => null);
        return b ?? { ts, processed: 0, failed: 0, totalMs: 0, maxMs: 0 };
      }),
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Scheduler — cross-process visibility via cache
  |--------------------------------------------------------------------------
  */

  async writeSchedulerTasks(tasks: SchedulerTaskInfo[]): Promise<void> {
    await Cache.set(K.scheduler, tasks, SCHEDULER_TTL);
  }

  async readSchedulerTasks(): Promise<SchedulerTaskInfo[]> {
    try {
      return (await Cache.get(K.scheduler)) ?? [];
    } catch {
      return [];
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Worker definitions — persisted so dashboard can list/restart workers
  |--------------------------------------------------------------------------
  */

  async writeWorkerDefs(defs: import("./HorizonManager.js").WorkerDefinition[]): Promise<void> {
    await Cache.set(K.wdefs, defs, null);
  }

  async readWorkerDefs(): Promise<import("./HorizonManager.js").WorkerDefinition[]> {
    try {
      return (await Cache.get(K.wdefs)) ?? [];
    } catch {
      return [];
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Read operations — called from the HTTP server process (dashboard)
  |--------------------------------------------------------------------------
  */

  async getWorkers(): Promise<WorkerSnapshot[]> {
    if (this.localWorkers.size > 0) return Array.from(this.localWorkers.values());
    try {
      const ids: string[] = (await Cache.get(K.wids)) ?? [];
      if (!ids.length) return [];
      const snaps = await Promise.all(ids.map((id) => Cache.get(K.worker(id)).catch(() => null)));
      const valid = snaps.filter(Boolean) as WorkerSnapshot[];
      if (valid.length < ids.length) {
        Cache.set(
          K.wids,
          valid.map((w) => w.id),
          null,
        ).catch(() => {});
      }
      return valid;
    } catch {
      return [];
    }
  }

  async getRecentJobs(limit = 100): Promise<CompletedJobRecord[]> {
    try {
      const jobs: CompletedJobRecord[] = (await Cache.get(K.jobs)) ?? [];
      return jobs.slice(0, limit);
    } catch {
      return [];
    }
  }

  async getThroughput(): Promise<number> {
    try {
      const ts: number[] = (await Cache.get(K.throughput)) ?? [];
      const cutoff = Date.now() - 60_000;
      return ts.filter((t) => t > cutoff).length;
    } catch {
      return 0;
    }
  }

  async summary() {
    const [workers, jobs, throughput] = await Promise.all([
      this.getWorkers(),
      this.getRecentJobs(JOBS_LIMIT),
      this.getThroughput(),
    ]);
    return {
      workers: workers.length,
      activeWorkers: workers.filter((w) => w.status === "running").length,
      pausedWorkers: workers.filter((w) => w.status === "paused").length,
      throughputPerMinute: throughput,
      totalProcessed: jobs.filter((j) => j.status === "processed").length,
      totalFailed: jobs.filter((j) => j.status === "failed").length,
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Cross-process control signals
  |--------------------------------------------------------------------------
  */

  static async writeSignal(workerId: string, signal: "pause" | "resume" | "stop"): Promise<void> {
    await Cache.set(K.ctrl(workerId), signal, 30);
  }

  static async readSignal(workerId: string): Promise<"pause" | "resume" | "stop" | null> {
    try {
      const sig = await Cache.get(K.ctrl(workerId));
      if (sig) await Cache.del(K.ctrl(workerId));
      return (sig as any) ?? null;
    } catch {
      return null;
    }
  }
}

export const horizonMetrics = new HorizonMetricsStore();

export const writeHorizonSignal = HorizonMetricsStore.writeSignal.bind(HorizonMetricsStore);
