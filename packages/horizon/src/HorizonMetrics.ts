import { Cache } from "@vest/cache";
import type { SerializedJob } from "@vest/queue";

/*
|--------------------------------------------------------------------------
| Horizon Metrics Store — Cache-backed, cross-process
|--------------------------------------------------------------------------
|
| Key layout (app prefix is added by the Cache module automatically):
|
|   horizon:wids          → string[]         worker IDs — NO TTL (persistent)
|   horizon:w:{id}        → WorkerSnapshot   90 s TTL, refreshed every 20 s
|   horizon:jobs          → CompletedJobRecord[]  ring buffer, 24 h TTL
|   horizon:throughput    → number[]         processed timestamps, 120 s TTL
|   horizon:ctrl:{id}     → string           control signal, 30 s TTL
|
| The worker IDs list has NO TTL so it never silently expires while a
| worker is running.  Stale entries (worker crashed without cleanup) are
| pruned automatically by getWorkers() when it can't find the matching
| snapshot.
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
  pid: number;
}

const WORKER_TTL = 90; // seconds — individual snapshot TTL (refreshed by heartbeat)
const JOBS_LIMIT = 500;

/** Per-minute aggregation bucket for throughput and duration charts. */
export interface JobMinuteBucket {
  ts: number; // minute start timestamp (ms, floor to minute)
  processed: number;
  failed: number;
  totalMs: number; // sum of durations (for avg)
  maxMs: number; // max single-job duration
}

const K = {
  wids: "horizon:wids",
  worker: (id: string) => `horizon:w:${id}`,
  jobs: "horizon:jobs",
  throughput: "horizon:throughput",
  ctrl: (id: string) => `horizon:ctrl:${id}`,
};

class HorizonMetricsStore {
  /** In-process worker cache — authoritative in the worker process. */
  private localWorkers = new Map<string, WorkerSnapshot>();
  /** In-process job ring buffer. */
  private localJobs: CompletedJobRecord[] = [];
  /** In-process throughput timestamps (last 60 s). */
  private localTimestamps: number[] = [];

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
      // IDs list has NO TTL — it persists until explicitly cleaned up or
      // stale entries are pruned by getWorkers().
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
   * Heartbeat method — called every 20 s by HorizonManager.
   * Refreshes BOTH the worker snapshot TTL AND re-upserts the worker ID
   * into the IDs list, preventing the snapshot from expiring during idle
   * periods and ensuring the IDs list stays consistent.
   */
  async keepAlive(id: string, patch: Partial<WorkerSnapshot>): Promise<void> {
    const local = this.localWorkers.get(id);
    if (!local) return;
    const updated = { ...local, ...patch };
    this.localWorkers.set(id, updated);

    try {
      // Refresh the snapshot (resets the 90 s TTL)
      await Cache.set(K.worker(id), updated, WORKER_TTL);
      // Re-upsert into the IDs list (no TTL — persistent)
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

  async recordJob(record: CompletedJobRecord): Promise<void> {
    this.localJobs.unshift(record);
    if (this.localJobs.length > JOBS_LIMIT) this.localJobs.pop();

    if (record.status === "processed") {
      this.localTimestamps.push(Date.now());
      this.pruneTimestamps();
    }

    try {
      await Cache.set(K.jobs, this.localJobs, 86400);
      if (record.status === "processed") {
        await Cache.set(K.throughput, this.localTimestamps, 120);
      }
      // Update per-minute chart bucket
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
      await Cache.set(key, b, 7200); // 2-hour TTL
    } catch {}
  }

  /** Returns per-minute aggregation buckets for the last `minutes` minutes. */
  async getMetrics(minutes = 60): Promise<JobMinuteBucket[]> {
    const currentMinute = Math.floor(Date.now() / 60_000) * 60_000;
    const buckets = await Promise.all(
      Array.from({ length: minutes }, async (_, i) => {
        const ts = currentMinute - (minutes - 1 - i) * 60_000;
        const b: JobMinuteBucket | null = await Cache.get(`horizon:mb:${ts}`).catch(() => null);
        return b ?? { ts, processed: 0, failed: 0, totalMs: 0, maxMs: 0 };
      }),
    );
    return buckets;
  }

  /*
  |--------------------------------------------------------------------------
  | Read operations — called from the HTTP server process
  |--------------------------------------------------------------------------
  */

  async getWorkers(): Promise<WorkerSnapshot[]> {
    // Prefer in-process data when available (worker process itself)
    if (this.localWorkers.size > 0) return Array.from(this.localWorkers.values());

    try {
      const ids: string[] = (await Cache.get(K.wids)) ?? [];
      if (!ids.length) return [];

      const snaps = await Promise.all(ids.map((id) => Cache.get(K.worker(id)).catch(() => null)));
      const valid = snaps.filter(Boolean) as WorkerSnapshot[];

      // Prune the IDs list if some snapshots expired (worker died)
      if (valid.length < ids.length) {
        const validIds = valid.map((w) => w.id);
        Cache.set(K.wids, validIds, null).catch(() => {});
      }
      return valid;
    } catch {
      return [];
    }
  }

  async getRecentJobs(limit = 100): Promise<CompletedJobRecord[]> {
    if (this.localJobs.length > 0) return this.localJobs.slice(0, limit);
    try {
      const jobs: CompletedJobRecord[] = (await Cache.get(K.jobs)) ?? [];
      return jobs.slice(0, limit);
    } catch {
      return [];
    }
  }

  async getThroughput(): Promise<number> {
    if (this.localTimestamps.length > 0) {
      this.pruneTimestamps();
      return this.localTimestamps.length;
    }
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

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  private pruneTimestamps(): void {
    const cutoff = Date.now() - 60_000;
    this.localTimestamps = this.localTimestamps.filter((t) => t > cutoff);
  }
}

export const horizonMetrics = new HorizonMetricsStore();

export const writeHorizonSignal = HorizonMetricsStore.writeSignal.bind(HorizonMetricsStore);
