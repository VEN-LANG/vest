import { getEventDispatcher } from "@vest/events";
import { horizonMetrics } from "@vest/horizon";
import { TelescopeStore } from "../TelescopeStore.js";

/*
|--------------------------------------------------------------------------
| Job Watcher
|--------------------------------------------------------------------------
|
| Two complementary strategies for capturing job events:
|
| 1. In-process (same Node.js process as the HTTP server):
|    Listens to the global EventDispatcher for `horizon:job.*` events fired
|    by HorizonManager. Zero latency.
|
| 2. Cross-process (artisan horizon:work in a separate process):
|    Polls the HorizonMetrics Cache every 3 s for new completed jobs and
|    records any that haven't been seen yet. Latency ≤ poll interval.
|
*/

export function activateJobWatcher(): void {
  // ── Strategy 1: in-process EventDispatcher ────────────────────────────────
  const dispatcher = getEventDispatcher();

  dispatcher.listen("horizon:job.processing", (payload: any) => {
    TelescopeStore.record(
      "job",
      {
        name: payload.job?.displayName,
        queue: payload.job?.queue,
        connection: payload.job?.connection ?? payload.connection ?? "default",
        status: "processing",
        attempts: payload.job?.attempts,
        uuid: payload.job?.uuid,
      },
      [payload.job?.displayName, `queue:${payload.job?.queue}`].filter(Boolean) as string[],
    );
  });

  dispatcher.listen("horizon:job.processed", (payload: any) => {
    TelescopeStore.record(
      "job",
      {
        name: payload.job?.displayName,
        queue: payload.job?.queue,
        connection: payload.connection ?? "default",
        status: "processed",
        durationMs: payload.durationMs,
        attempts: payload.job?.attempts,
        uuid: payload.job?.uuid,
      },
      [payload.job?.displayName, `queue:${payload.job?.queue}`, "processed"].filter(
        Boolean,
      ) as string[],
    );
  });

  dispatcher.listen("horizon:job.failed", (payload: any) => {
    TelescopeStore.record(
      "job",
      {
        name: payload.job?.displayName,
        queue: payload.job?.queue,
        connection: payload.connection ?? "default",
        status: "failed",
        durationMs: payload.durationMs,
        exception: payload.exception,
        attempts: payload.job?.attempts,
        uuid: payload.job?.uuid,
      },
      [payload.job?.displayName, `queue:${payload.job?.queue}`, "failed"].filter(
        Boolean,
      ) as string[],
    );
  });

  // ── Strategy 2: cross-process Cache poll ──────────────────────────────────
  // Tracks the UUID of the most-recently-seen job so we don't re-record jobs.
  let lastSeenUuid: string | null = null;

  const pollJobs = async () => {
    try {
      const recent = await horizonMetrics.getRecentJobs(20);
      if (!recent.length) return;

      // Jobs are newest-first. Find where we left off.
      const cutoffIdx = lastSeenUuid ? recent.findIndex((j) => j.uuid === lastSeenUuid) : -1;
      // Everything before cutoffIdx is new (or all of them if lastSeen not found)
      const newJobs = cutoffIdx === -1 ? recent : recent.slice(0, cutoffIdx);

      for (const job of newJobs.reverse()) {
        // record oldest→newest
        // Skip if already recorded by the in-process dispatcher (same UUID in store)
        const alreadyRecorded = TelescopeStore.getEntries({ type: "job", limit: 50 }).some(
          (e) => e.content.uuid === job.uuid,
        );
        if (alreadyRecorded) continue;

        TelescopeStore.record(
          "job",
          {
            name: job.displayName,
            queue: job.queue,
            connection: job.connection,
            status: job.status,
            durationMs: job.durationMs,
            exception: job.exception,
            uuid: job.uuid,
            completedAt: job.completedAt,
          },
          [job.displayName, `queue:${job.queue}`, job.status].filter(Boolean) as string[],
        );
      }

      lastSeenUuid = recent[0].uuid;
    } catch {
      // best-effort — never break the dashboard
    }
  };

  // Poll every 3 s — aligns with the dashboard auto-refresh interval
  setInterval(pollJobs, 3000);
  pollJobs(); // immediate first poll
}
