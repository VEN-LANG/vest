# Queue Workers

Workers process jobs from the queue.

## Starting a Worker

```bash
pnpm exec artisan queue:work
```

## Worker Options

```bash
pnpm exec artisan queue:work --delay=3 --memory=128 --timeout=60 --sleep=3 --tries=3
```

| Option      | Default | Description           |
| ----------- | ------- | --------------------- |
| `--delay`   | 0       | Delay between jobs    |
| `--memory`  | 128     | Memory limit (MB)     |
| `--timeout` | 60      | Job timeout (seconds) |
| `--sleep`   | 3       | Sleep when no jobs    |
| `--tries`   | 1       | Default max tries     |
| `--queue`   | default | Queue to process      |
| `--rest`    | 0       | Rest between jobs     |

## Worker Events

```typescript
worker.on("worker:start", () => console.log("Worker started"));
worker.on("worker:stop", () => console.log("Worker stopped"));
worker.on("worker:pause", () => console.log("Worker paused"));
worker.on("worker:resume", () => console.log("Worker resumed"));
worker.on("job:processing", (job) => console.log("Processing:", job));
worker.on("job:processed", (job) => console.log("Processed:", job));
worker.on("job:failed", (job, error) => console.log("Failed:", error));
worker.on("job:exception", (job, error) => console.log("Exception:", error));
```

## Programmatic Worker

```typescript
import { Worker } from "@lara-node/queue";

const worker = new Worker({
  delay: 3,
  memory: 128,
  timeout: 60,
  sleep: 3,
  maxTries: 3,
});

await worker.daemon();
```

## Control Worker

```typescript
await worker.pause();
await worker.resume();
await worker.stop();
```

## Restart Worker

```bash
pnpm exec artisan queue:restart
```

## Next Steps

- [Jobs](/packages/queue/jobs) -- Creating jobs
- [Scheduler](/packages/queue/scheduler) -- Task scheduling
- [Failed Jobs](/packages/queue/failed-jobs) -- Failed job handling
