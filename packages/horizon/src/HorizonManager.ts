import { Worker } from "@lara-node/queue";
import { scheduler } from "@lara-node/queue";
import { Queue } from "@lara-node/queue";
import { horizonMetrics, writeHorizonSignal } from "./HorizonMetrics.js";
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

        let jobStartTime = 0;

        worker.on("worker:start", ({ connection: conn, queues: qs }) => {
            horizonMetrics.registerWorker(id, {
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
            }).catch(() => {});
        });

        worker.on("job:processing", ({ job }) => {
            jobStartTime = Date.now();
            horizonMetrics.updateWorker(id, {
                currentJob: job,
                memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
                runtimeSeconds: worker.getRuntime(),
            }).catch(() => {});
            getEventDispatcher().dispatchNow("horizon:job.processing", { workerId: id, job });
        });

        worker.on("job:processed", ({ job }) => {
            const durationMs = jobStartTime ? Date.now() - jobStartTime : 0;
            const conn = connection || queueConfig.default;
            horizonMetrics.updateWorker(id, {
                jobsProcessed: worker.getJobsProcessed(),
                currentJob: null,
                memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
                runtimeSeconds: worker.getRuntime(),
                lastRun: new Date(),
            }).catch(() => {});
            horizonMetrics.recordJob({
                uuid: job.uuid,
                displayName: job.displayName,
                queue: job.queue,
                connection: conn,
                completedAt: new Date(),
                durationMs,
                status: "processed",
            }).catch(() => {});
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
            horizonMetrics.updateWorker(id, {
                currentJob: null,
                memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
                runtimeSeconds: worker.getRuntime(),
                lastRun: new Date(),
            }).catch(() => {});
            horizonMetrics.recordJob({
                uuid: job.uuid,
                displayName: job.displayName,
                queue: job.queue,
                connection: conn,
                completedAt: new Date(),
                durationMs,
                status: "failed",
                exception: exception.message,
            }).catch(() => {});
            getEventDispatcher().dispatchNow("horizon:job.failed", {
                workerId: id,
                job,
                durationMs,
                connection: conn,
                exception: exception.message,
            });
        });

        worker.on("worker:pause", () => horizonMetrics.updateWorker(id, { status: "paused" }).catch(() => {}));
        worker.on("worker:resume", () => horizonMetrics.updateWorker(id, { status: "running" }).catch(() => {}));
        worker.on("worker:stop", () => {
            horizonMetrics.updateWorker(id, { status: "stopped" }).catch(() => {});
            clearInterval(heartbeat);

            // If still in the workers map, the stop was self-initiated (memory limit,
            // queue:restart signal, stopWhenEmpty, etc.) — auto-restart after a short delay.
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

        worker.on("worker:memory-exceeded", ({ memoryMb, limitMb }: { memoryMb: number; limitMb: number }) => {
            console.log(
                `[Horizon] Worker ${id} hit memory limit (${memoryMb}/${limitMb} MB) — stopping for restart...`,
            );
            // Restart is handled uniformly by the worker:stop handler above.
        });

        // Heartbeat — refreshes both the worker snapshot TTL AND the IDs list
        // so neither ever silently expires while the worker is running.
        // Fires every 20 s (well within the 90 s snapshot TTL).
        const heartbeat = setInterval(() => {
            if (!worker.isRunning()) {
                clearInterval(heartbeat);
                return;
            }
            horizonMetrics.keepAlive(id, {
                memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
                runtimeSeconds: worker.getRuntime(),
                jobsProcessed: worker.getJobsProcessed(),
            }).catch(() => {});
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
        if (w) w.worker.pause(); // immediate for in-process
        writeHorizonSignal(id, "pause").catch(() => {});
        return true;
    }

    resumeWorker(id: string): boolean {
        const w = this.workers.get(id);
        if (w) {
            // Worker is alive (paused) — just unpause it
            w.worker.resume();
            writeHorizonSignal(id, "resume").catch(() => {});
        } else {
            // Worker was stopped — restart it from its saved definition
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
            // Remove from the active map first so the memory-exceeded handler
            // sees it as intentionally stopped and does not auto-restart.
            this.workers.delete(id);
            entry.worker.stop();
            horizonMetrics.removeWorker(id).catch(() => {});
        }
        // Keep workerDefs so the worker can be restarted via resumeWorker.
        writeHorizonSignal(id, "stop").catch(() => {});
        return true;
    }

    /*
    |--------------------------------------------------------------------------
    | Scheduler
    |--------------------------------------------------------------------------
    */

    getSchedulerTasks() {
        return scheduler.getTasks().map((t) => ({
            name: t.name,
            expression: t.expression,
            description: t.description,
            isRunning: t.isRunning,
            lastRun: t.lastRun,
            nextRun: t.nextRun,
        }));
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
