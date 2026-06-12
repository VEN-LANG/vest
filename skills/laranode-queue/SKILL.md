---
name: laranode-queue
description: >-
  Job queue system with sync, database, and Redis drivers. Includes Job classes,
  queue workers in daemon mode, task scheduler with cron, failed job tracking,
  delays/retries/backoff, and job encryption. Activates for questions about
  Job, @Queueable, dispatch(), Worker, Schedule, or queue configuration.
---

# @lara-node/queue

Job queue system with workers and task scheduler.

## Key Exports

| Export | Description |
|--------|-------------|
| `Job` | Base job class |
| `@Queueable()` | Job decorator |
| `dispatch()` | Dispatch helper |
| `PendingDispatch` | Fluent dispatch builder |
| `Queue` / `QueueManager` | Queue manager |
| `Worker` | Queue worker daemon |
| `Schedule` / `scheduler` | Task scheduler |

## Quick Start

```typescript
import { Job, Queueable } from "@lara-node/queue";

@Queueable()
class SendWelcomeEmail extends Job {
  constructor(private userId: number) { super(); }

  async handle() {
    const user = await User.find(this.userId);
    await Mail.to(user.email).send(new WelcomeMail(user));
  }
}

// Dispatch
await SendWelcomeEmail.dispatch(userId);
await SendWelcomeEmail.dispatch(userId)
  .onQueue("emails")
  .withDelay(60)
  .withTries(3);
```

## Worker

```bash
pnpm exec artisan queue:work --queue=emails
```

## Scheduler

```typescript
import { Schedule } from "@lara-node/queue";

Schedule.command("emails:send").dailyAt("09:00");
Schedule.job(ProcessReports).weekly().mondays();
Schedule.call(async () => { /* ... */ }).everyMinute();
```
