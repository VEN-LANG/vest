# Jobs

Jobs are classes that represent units of work to be processed by queue workers.

## Creating Jobs

```typescript
import { Job, Queueable } from '@lara-node/queue'

@Queueable()
class ProcessPodcast extends Job {
  constructor(private podcastId: number) {
    super()
  }

  async handle() {
    const podcast = await Podcast.find(this.podcastId)
    // Process the podcast
  }
}
```

## Job Properties

```typescript
@Queueable({
  queue: 'default',
  connection: 'redis',
  tries: 3,
  timeout: 60,
  backoff: [10, 30, 60],
})
class MyJob extends Job {
  // ...
}
```

| Property | Default | Description |
|----------|---------|-------------|
| `queue` | `'default'` | Queue name |
| `connection` | default | Queue connection |
| `tries` | 1 | Max retry attempts |
| `timeout` | 60 | Timeout in seconds |
| `backoff` | `[]` | Delay between retries |
| `delay` | 0 | Delay before running |

## Dispatching Jobs

```typescript
// Basic dispatch
await ProcessPodcast.dispatch(podcastId)

// Fluent dispatch
await ProcessPodcast.dispatch(podcastId)
  .onQueue('podcasts')
  .onConnection('redis')
  .withDelay(300)
  .withTries(5)
  .withTimeout(120)
  .withBackoff([10, 30, 60])
```

## Sync Dispatch

Run immediately without queue:

```typescript
await ProcessPodcast.dispatchSync(podcastId)
```

## Dispatch After Response

```typescript
await ProcessPodcast.dispatch(podcastId).afterResponse()
```

## Job Lifecycle

```typescript
class ProcessPodcast extends Job {
  async handle() {
    // Main job logic
  }

  async failed(error: Error) {
    // Called when job fails
    console.error('Job failed:', error.message)
  }

  async middleware() {
    // Middleware to run before job
  }

  tags() {
    // Tags for monitoring
    return ['podcast', `podcast:${this.podcastId}`]
  }
}
```

## Unique Jobs

Prevent duplicate jobs:

```typescript
@Queueable({
  uniqueId: 'podcast',
  uniqueFor: 3600, // 1 hour
})
class ProcessPodcast extends Job {
  // Only one job per podcastId per hour
}
```

## Encrypted Jobs

```typescript
@Queueable({
  shouldBeEncrypted: true,
})
class SensitiveJob extends Job {
  // Payload is encrypted
}
```

## Next Steps

- [Workers](/packages/queue/workers) -- Queue workers
- [Scheduler](/packages/queue/scheduler) -- Task scheduling
- [Failed Jobs](/packages/queue/failed-jobs) -- Failed job handling
