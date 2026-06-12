# Failed Jobs

Track and manage failed queue jobs.

## Failed Job Storage

Failed jobs are stored in the `failed_jobs` table (database driver) or tracked in Redis.

## Viewing Failed Jobs

```bash
# Via Horizon dashboard
# Visit /horizon/failed
```

## Retrying Failed Jobs

```bash
# Retry all failed jobs
pnpm exec artisan queue:retry all

# Retry specific job
pnpm exec artisan queue:retry <job-id>
```

## Forgetting Failed Jobs

```bash
# Forget a failed job
pnpm exec artisan queue:forget <job-id>

# Forget all failed jobs
pnpm exec artisan queue:flush-failed
```

## Programmatic Access

```typescript
import { Queue } from "@lara-node/queue";

// Get failed jobs
const failed = Queue.getFailedJobs();

// Retry failed
await Queue.retryFailed(jobId);

// Forget failed
await Queue.forgetFailed(jobId);

// Flush all failed
await Queue.flushFailed();
```

## Job Failed Callback

```typescript
class ProcessPodcast extends Job {
  async handle() {
    // Job logic
  }

  async failed(error: Error) {
    // Called when job fails after all retries
    await Notification.send(admin, "Job failed: " + error.message);
  }
}
```

## Retry Until

Set a time limit for retries:

```typescript
class ProcessPodcast extends Job {
  retryUntil() {
    return Date.now() + 3600000; // 1 hour from now
  }
}
```

## Next Steps

- [Jobs](/packages/queue/jobs) -- Creating jobs
- [Workers](/packages/queue/workers) -- Queue workers
- [Horizon](/packages/horizon) -- Queue monitoring
