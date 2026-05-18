# @lara-node/horizon

Queue monitoring dashboard and supervisor for Lara-Node — real-time worker visibility, job metrics, pause/resume, and a built-in web UI at `/horizon`.

## Installation

```sh
pnpm add @lara-node/horizon
```

## Quick Start

1. Register the service provider:

```ts
import { Application } from '@lara-node/core';
import { HorizonServiceProvider } from '@lara-node/horizon';

const app = new Application(container);
app.register(HorizonServiceProvider);
await app.boot();
app.listen(3000);
```

2. Start the Horizon supervisor:

```sh
node artisan horizon:start
```

3. Open `http://localhost:3000/horizon` in your browser.

## API

### `HorizonManager`

Manages worker processes for the supervisor.

```ts
import { HorizonManager } from '@lara-node/horizon';

const manager = new HorizonManager();

// Start a worker
await manager.startWorker({
  name: 'main',
  connection: 'redis',
  queue: ['default', 'high'],
  balance: 'auto',
  processes: 10,
  tries: 3,
  memory: 128,
  timeout: 60,
});

// Control workers
await manager.stopWorker('main');
await manager.pauseWorker('main');
await manager.resumeWorker('main');

// Inspect
const workers = manager.getWorkers();
```

### `HorizonServiceProvider`

Registers all Horizon routes, mounts the dashboard, and starts the supervisor lifecycle. Register it in your application bootstrap:

```ts
app.register(HorizonServiceProvider);
```

### Artisan commands

```sh
node artisan horizon:start    # start all supervisors defined in horizon.config.ts
node artisan horizon:pause    # pause all workers (no new jobs picked up)
node artisan horizon:resume   # resume all workers
node artisan horizon:status   # print worker and queue status
```

## Dashboard

The dashboard is served at the path defined by `HORIZON_PATH` (default `/horizon`). It shows:

- Worker process status and memory usage
- Job throughput (processed, failed, queued per minute)
- Failed jobs with full payload and exception trace
- Recent jobs with execution time

### Protecting the dashboard

Set `HORIZON_TOKEN` to require a token on all dashboard requests. The token is accepted as a query string parameter or an `Authorization: Bearer` header.

```
GET /horizon?token=my-secret-token
Authorization: Bearer my-secret-token
```

## Config File

Create `config/horizon.config.ts` (or wherever your config loader points):

```ts
import { HorizonConfig } from '@lara-node/horizon';

export default {
  enabled: true,
  path: '/horizon',
  token: process.env.HORIZON_TOKEN,

  environments: {
    production: {
      supervisor: [
        {
          name: 'main',
          connection: 'redis',
          queue: ['high', 'default', 'low'],
          balance: 'auto',     // 'auto' | 'simple' | 'false'
          processes: 10,
          tries: 3,
          memory: 128,         // MB — worker restarts if it exceeds this
          timeout: 60,         // seconds
        },
        {
          name: 'notifications',
          connection: 'redis',
          queue: ['notifications'],
          balance: 'simple',
          processes: 3,
          tries: 5,
          memory: 64,
          timeout: 30,
        },
      ],
    },

    local: {
      supervisor: [
        {
          name: 'main',
          connection: 'redis',
          queue: ['default'],
          balance: 'false',
          processes: 3,
          tries: 1,
          memory: 128,
          timeout: 60,
        },
      ],
    },
  },
} satisfies HorizonConfig;
```

Load it in a service provider:

```ts
import { setConfig } from '@lara-node/core';
import horizonConfig from '../config/horizon.config';

setConfig('horizon', horizonConfig);
```

## Environment Variables

| Variable           | Default    | Description                                                     |
|--------------------|------------|-----------------------------------------------------------------|
| `HORIZON_ENABLED`  | `true`     | Set to `false` to disable Horizon entirely                      |
| `HORIZON_PATH`     | `/horizon` | URL path where the dashboard is mounted                         |
| `HORIZON_TOKEN`    | —          | Optional access token for dashboard protection                  |
| `HORIZON_QUEUES`   | `default`  | Comma-separated queue names for the default supervisor          |
| `HORIZON_PROCESSES`| `10`       | Number of worker processes (`3` in local environment)           |
| `QUEUE_CONNECTION` | —          | Underlying queue driver used by workers                         |

## Notes

- Horizon requires a Redis queue connection (`QUEUE_CONNECTION=redis`). It does not support the `sync` or `database` drivers.
- Worker processes are spawned as child processes. Ensure your entry script is executable and supports the `queue:work` artisan command.
- The balance strategy `auto` dynamically scales workers across queues based on queue depth. `simple` distributes equally. `false` keeps a fixed number of workers per queue.
