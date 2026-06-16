# Horizon Dashboard

The Horizon dashboard provides real-time queue monitoring.

## Accessing the Dashboard

Visit `/horizon` in your browser.

## Features

- **Queue overview** -- Queue sizes and job counts
- **Worker status** -- Running, paused, stopped workers
- **Job metrics** -- Throughput, runtime, failures
- **Failed jobs** -- View, retry, or forget failed jobs
- **Scheduler tasks** -- Scheduled task status

## Managing Workers

```typescript
import { HorizonManager } from "@lara-node/horizon";

const manager = new HorizonManager();

// Start worker
await manager.startWorker(workerDef);

// Pause worker
await manager.pauseWorker(workerId);

// Resume worker
await manager.resumeWorker(workerId);

// Stop worker
await manager.stopWorker(workerId);
```

## Queue Management

```typescript
// Get queue jobs
const jobs = manager.getQueueJobs("default");

// Get queue sizes
const sizes = manager.getQueueSizes();

// Purge queue
await manager.purgeQueue("default");
```

## Failed Jobs

```typescript
// Get failed jobs
const failed = manager.getFailedJobs();

// Retry failed job
await manager.retryFailed(jobId);

// Forget failed job
await manager.forgetFailed(jobId);

// Flush all failed
await manager.flushFailed();
```

## Next Steps

- [Horizon Overview](/packages/horizon) -- Overview
- [Configuration](/packages/horizon/configuration) -- Configure Horizon
- [Telescope](/packages/telescope) -- Debug dashboard
