# @lara-node/queue

Queue system, job scheduler, and background worker for [Lara-Node](https://github.com/venomous-maker/vest). Supports sync, database, and Redis drivers.

## Installation

```bash
pnpm add @lara-node/queue
```

---

## Decorators

### `@Queueable(nameOrOptions?)`

Registers a Job class in the global job registry (required for the worker to deserialize and execute it) and sets class-level defaults for `queue`, `tries`, `timeout`, and `connection`. These defaults are applied automatically on every `dispatch()` call.

```typescript
import { Job, Queueable } from '@lara-node/queue';

// Basic — registers under class name, uses config defaults
@Queueable()
export class SendMailJob extends Job {
  async handle(): Promise<void> { ... }
}

// With queue options — applied on every dispatch automatically
@Queueable({ queue: 'emails', tries: 3 })
export class SendMailJob extends Job { ... }

@Queueable({ queue: 'reports', tries: 2, timeout: 300 })
export class GenerateReportJob extends Job { ... }

@Queueable({ queue: 'default', tries: 1, connection: 'redis' })
export class CleanupJob extends Job { ... }

// Custom registry name (for serialization)
@Queueable({ name: 'send-mail', queue: 'emails' })
export class SendMailJob extends Job { ... }
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Registry key used for serialization. Defaults to class name. |
| `queue` | `string` | Target queue name. Overrides the default queue. |
| `tries` | `number` | Max attempt count. |
| `timeout` | `number` | Execution timeout in seconds. |
| `connection` | `string` | Queue connection name (e.g. `'redis'`, `'database'`). |

**Per-dispatch overrides still work:**
```typescript
// @Queueable defaults are applied, then fluent overrides on top
SendMailJob.dispatch().onQueue('urgent').tries(5).dispatch();
```

---

### `shouldQueue()` — conditional dispatch

Override `shouldQueue()` on a Job to conditionally skip dispatch. If it returns `false`, `PendingDispatch.dispatch()` discards the job silently — no need to wrap dispatch in an `if` statement.

```typescript
@Queueable({ queue: 'notifications' })
export class NotifyUserJob extends Job {
  constructor(private user: User) { super(); }

  // Skip dispatch if the user has disabled notifications
  shouldQueue(): boolean {
    return this.user.notificationsEnabled;
  }

  async handle(): Promise<void> {
    // Only runs if shouldQueue() returned true
  }
}

// Clean call-site — no if-statement needed
await NotifyUserJob.dispatch().dispatch();
```

---

## Dispatching Jobs

```typescript
import { Queue } from '@lara-node/queue';

// Static dispatch (uses class-level @Queueable defaults)
await SendMailJob.dispatch().dispatch();

// Fluent overrides
await GenerateReportJob
  .dispatch()
  .onQueue('priority')
  .tries(5)
  .timeout(600)
  .delay(30)
  .dispatch();

// Push an instance directly
const job = new SendMailJob({ to: 'alice@example.com', subject: 'Hello' });
await Queue.push(job);

// Delayed dispatch
await Queue.later(60, job);

// Synchronous (bypasses the queue)
await SendMailJob.dispatchSync();

// After HTTP response
await SendMailJob.dispatch().afterResponse().dispatch();
```

---

## Job Base Class

```typescript
export abstract class Job {
  // Properties (can be set via @Queueable or fluent methods)
  public queue: string;
  public connection: string;
  public tries: number;
  public timeout: number;
  public backoff: number | number[];
  public delay: number;
  public shouldBeEncrypted: boolean;

  // Must implement
  abstract handle(): Promise<void>;

  // Override to gate dispatch
  shouldQueue(): boolean { return true; }

  // Override for failure handling
  failed(error: Error): void {}

  // Override for retry deadline
  retryUntil(): Date | null { return null; }

  // Override for tags (Horizon grouping)
  tags(): string[] { return []; }
}
```

---

## Scheduler

```typescript
import { scheduler } from '@lara-node/queue';

scheduler.job(CleanupJob).daily();
scheduler.job(GenerateReportJob, { type: 'users', period: 'weekly' }).weekly();
scheduler.command('db:prune').hourly();
scheduler.call(() => console.log('tick')).everyMinute();
```

---

## Configuration

```typescript
// config/queue.config.ts
export default {
  default: 'database',
  connections: {
    sync:     { driver: 'sync' },
    database: { driver: 'database', table: 'jobs' },
    redis:    { driver: 'redis', host: 'localhost', port: 6379 },
  },
  defaults: {
    tries: 3,
    timeout: 60,
    maxExceptions: 3,
    backoff: 0,
  },
};
```

---

## License

MIT
