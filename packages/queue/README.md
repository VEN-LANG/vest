# @lara-node/queue

Job queue (sync, database, Redis), cron scheduler, and background worker for [Lara-Node](https://github.com/venomous-maker/vest).

## Installation

```sh
pnpm add @lara-node/queue
```

## Quick Start

```ts
import { Job, Queueable, Queue } from '@lara-node/queue';

@Queueable({ queue: 'emails', tries: 3 })
export class SendMailJob extends Job {
  constructor(private readonly to: string) {
    super();
  }

  async handle(): Promise<void> {
    await mailer.send(this.to);
  }
}

// Dispatch
await SendMailJob.dispatch().dispatch();
```

Start a worker:

```sh
node artisan queue:work --connection=redis --queue=emails,default
```

## Jobs

### `Job` base class

```ts
export abstract class Job {
  queue: string;               // target queue name
  connection: string;          // queue connection name
  tries: number;               // max attempt count
  timeout: number;             // execution timeout in seconds
  backoff: number | number[];  // seconds between retries (can be stepped: [5, 10, 30])
  delay: number;               // initial delay in seconds
  shouldBeEncrypted: boolean;  // encrypt payload at rest using APP_KEY

  abstract handle(): Promise<void>;

  // Override to conditionally skip dispatch
  shouldQueue(): boolean { return true; }

  // Override to handle final failure
  failed(error: Error): void {}

  // Override to set a retry deadline
  retryUntil(): Date | null { return null; }

  // Override to add Horizon grouping tags
  tags(): string[] { return []; }
}
```

### `@Queueable(nameOrOptions?)`

Registers a job in the global registry (required for workers to deserialize it) and sets class-level defaults.

```ts
import { Job, Queueable } from '@lara-node/queue';

@Queueable()
export class BasicJob extends Job {
  async handle(): Promise<void> { /* ... */ }
}

@Queueable({ queue: 'reports', tries: 2, timeout: 300 })
export class GenerateReportJob extends Job {
  async handle(): Promise<void> { /* ... */ }
}

// Custom serialization name
@Queueable({ name: 'send-mail', queue: 'emails' })
export class SendMailJob extends Job {
  async handle(): Promise<void> { /* ... */ }
}
```

| Option       | Type     | Description                                           |
|--------------|----------|-------------------------------------------------------|
| `name`       | `string` | Registry key for serialization (default: class name)  |
| `queue`      | `string` | Target queue name                                     |
| `tries`      | `number` | Max attempt count                                     |
| `timeout`    | `number` | Execution timeout in seconds                          |
| `connection` | `string` | Queue connection name (e.g. `redis`, `database`)      |

### `shouldQueue()` — conditional dispatch

Override to skip dispatch without wrapping call sites in `if` statements:

```ts
@Queueable({ queue: 'notifications' })
export class NotifyUserJob extends Job {
  constructor(private readonly user: User) { super(); }

  shouldQueue(): boolean {
    return this.user.notificationsEnabled;
  }

  async handle(): Promise<void> {
    await sendPushNotification(this.user.id);
  }
}

// No if-statement needed — job is silently discarded when shouldQueue() returns false
await NotifyUserJob.dispatch().dispatch();
```

## Dispatching

```ts
import { Queue } from '@lara-node/queue';

// Via static dispatch — uses @Queueable defaults
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
const job = new SendMailJob('alice@example.com');
await Queue.push(job);

// Push to a specific queue
await Queue.pushOn('high', job);

// Delayed dispatch (seconds)
await Queue.later(60, job);

// Synchronous — bypasses the queue, runs handle() inline
await SendMailJob.dispatchSync();

// After HTTP response is sent
await SendMailJob.dispatch().afterResponse().dispatch();
```

### `Queue` facade

```ts
import { Queue } from '@lara-node/queue';

await Queue.push(job)             // push to job's queue property
await Queue.pushOn('high', job)   // push to named queue
await Queue.later(60, job)        // delay in seconds
await Queue.size('default')       // pending job count
await Queue.clear('default')      // clear all jobs in a queue
```

## Worker

Processes jobs from the queue. Used internally by `node artisan queue:work`.

```ts
import { Worker } from '@lara-node/queue';

const worker = new Worker('redis', ['high', 'default'], {
  tries: 3,
  timeout: 60,
  sleep: 1,
  maxJobs: 0,       // 0 = unlimited
  maxTime: 0,       // 0 = unlimited
  stopOnEmpty: false,
});

worker.on('job:processed', (job) => console.log('Done:', job.constructor.name));
worker.on('job:failed', (job, err) => console.error('Failed:', err.message));
worker.on('worker:start', () => console.log('Worker started'));
worker.on('worker:stop', () => console.log('Worker stopped'));

await worker.start();
```

## Scheduler

Used inside `Kernel.schedule()`. See `@lara-node/console` for the `Kernel` API.

```ts
import { scheduler } from '@lara-node/queue';

// Class-based job
scheduler.job(CleanupJob).daily();
scheduler.job(GenerateReportJob, { type: 'weekly' }).weekly();

// Artisan command
scheduler.command('db:prune').hourly();
scheduler.command('cache:clear').dailyAt('00:00');

// Closure
scheduler.call(() => console.log('tick')).everyMinute();
scheduler.call(async () => await sendWeeklyReport()).cron('0 8 * * 1');
```

### Frequency helpers

```ts
.everyMinute()
.everyFiveMinutes()
.everyTenMinutes()
.everyFifteenMinutes()
.everyThirtyMinutes()
.hourly()
.hourlyAt(17)              // :17 past every hour
.daily()
.dailyAt('13:00')
.twiceDaily(1, 13)         // 01:00 and 13:00
.weekdays()                // Mon–Fri
.weekends()
.weekly()
.monthly()
.cron('0 8 * * 1')         // custom expression
.timezone('UTC')
```

### Modifiers

```ts
.withoutOverlapping()      // skip if previous run is still active
.onOneServer()             // only one server runs this task (requires Redis)
.runInBackground()         // run in a child process
.sendOutputTo('/tmp/out.log')
.appendOutputTo('/tmp/out.log')
.emailOutputTo('admin@example.com')
```

## Config File

```ts
// config/queue.config.ts
import { setConfig } from '@lara-node/core';

setConfig('queue', {
  default: 'redis',
  connections: {
    sync: {
      driver: 'sync',
    },
    database: {
      driver: 'database',
      table: 'jobs',
    },
    redis: {
      driver: 'redis',
      connection: 'default',
      queue: 'default',
      retry_after: 90,
      block_for: null,
    },
  },
  defaults: {
    tries: 3,
    timeout: 60,
    maxExceptions: 3,
    backoff: 0,
  },
});
```

## `QueueServiceProvider`

```ts
import { QueueServiceProvider } from '@lara-node/queue';

app.register(QueueServiceProvider);
```

## Environment Variables

| Variable                | Default   | Description                                               |
|-------------------------|-----------|-----------------------------------------------------------|
| `QUEUE_CONNECTION`      | `sync`    | Default driver: `sync`, `database`, or `redis`            |
| `REDIS_QUEUE_CONNECTION`| `default` | Redis connection name                                     |
| `REDIS_QUEUE`           | `default` | Redis queue name                                          |
| `REDIS_HOST`            | `127.0.0.1` | Redis host                                              |
| `REDIS_PORT`            | `6379`    | Redis port                                                |
| `REDIS_PASSWORD`        | —         | Redis password                                            |
| `REDIS_URL`             | —         | Full Redis URL (overrides host/port/password)             |
| `APP_KEY`               | —         | AES-256-GCM encryption key for `shouldBeEncrypted` jobs   |

## Notes

- The `sync` driver executes jobs inline, blocking the current process. Use only for development or testing.
- Job payloads are JSON-serialized. Circular references and non-serializable values (e.g. database connections) in job constructor arguments will cause errors at dispatch time.
- When `shouldBeEncrypted = true`, the full job payload is AES-256-GCM encrypted using `APP_KEY` before being pushed to the queue. The worker decrypts it transparently.
