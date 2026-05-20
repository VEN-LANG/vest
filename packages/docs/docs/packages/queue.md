# Queue Package

The `@lara-node/queue` package provides a job queue system with workers and a task scheduler.

## Installation

```bash
pnpm add @lara-node/queue @lara-node/core
```

## Overview

Features include:

- **Multiple drivers** -- Sync, Database, Redis
- **Job classes** with lifecycle methods
- **Queue workers** with daemon mode
- **Task scheduler** with cron expressions
- **Failed job tracking** and retry
- **Job encryption**
- **Delays, retries, backoff**

## Quick Start

### Create a Job

```typescript
import { Job, Queueable } from '@lara-node/queue'

@Queueable()
class SendWelcomeEmail extends Job {
  constructor(private userId: number) {
    super()
  }

  async handle() {
    const user = await User.find(this.userId)
    await Mail.to(user.email).send(new WelcomeMail(user))
  }
}
```

### Dispatch a Job

```typescript
// Dispatch to queue
await SendWelcomeEmail.dispatch(userId)

// Dispatch with options
await SendWelcomeEmail.dispatch(userId)
  .onQueue('emails')
  .withDelay(60)
  .withTries(3)
```

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

## Configuration

```typescript
// config/queue.config.ts
export default {
  default: process.env.QUEUE_CONNECTION || 'sync',
  connections: {
    sync: { driver: 'sync' },
    database: { driver: 'database', table: 'jobs' },
    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  },
}
```

## Next Steps

- [Jobs](/packages/queue/jobs) -- Creating jobs
- [Workers](/packages/queue/workers) -- Queue workers
- [Scheduler](/packages/queue/scheduler) -- Task scheduling
