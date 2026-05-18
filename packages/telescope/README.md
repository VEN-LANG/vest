# @lara-node/telescope

In-process debug assistant — records HTTP requests, DB queries, jobs, cache ops, logs, exceptions, and scheduler events. Serves a live dashboard at `/telescope`.

## Installation

```sh
pnpm add @lara-node/telescope
```

## Quick Start

Register the service provider in your application bootstrap:

```ts
import { Application } from '@lara-node/core';
import { TelescopeServiceProvider } from '@lara-node/telescope';

const app = new Application(container);
app.register(TelescopeServiceProvider);
await app.boot();
app.listen(3000);
```

Open `http://localhost:3000/telescope` to access the dashboard.

## API

### `TelescopeServiceProvider`

Registers all watchers and mounts the dashboard route. This is the only export you need for standard use.

```ts
import { TelescopeServiceProvider } from '@lara-node/telescope';

app.register(TelescopeServiceProvider);
```

### `TelescopeStore`

In-memory circular buffer that holds all recorded entries.

```ts
import { TelescopeStore } from '@lara-node/telescope';

// Record a custom entry
TelescopeStore.record('custom', { message: 'Something happened' }, ['tag:foo']);

// Retrieve entries
const entries = TelescopeStore.getEntries({ type: 'request', limit: 50 });
const entry   = TelescopeStore.getEntry(entryId);

// Clear entries
TelescopeStore.clear();           // clear all
TelescopeStore.clear('queries');  // clear only DB query entries
```

### Watcher classes

Individual watchers can be instantiated and configured separately if you need more control:

```ts
import { QueryWatcher, CacheWatcher } from '@lara-node/telescope';

const queryWatcher = new QueryWatcher();
queryWatcher.listen(); // starts recording DB queries

const cacheWatcher = new CacheWatcher();
cacheWatcher.listen(); // starts recording cache operations
```

## Dashboard

The dashboard is mounted at the path defined by `TELESCOPE_PATH` (default `/telescope`). It provides a live view of:

- **Requests** — method, path, status, duration, headers, payload, and response body
- **Queries** — SQL / MongoDB operations with execution time and calling model
- **Jobs** — dispatched and processed jobs with payload and status
- **Cache** — get/set/miss/forget events with key and value
- **Logs** — captured log entries with level and context
- **Exceptions** — full exception traces with file and line information
- **Scheduler** — scheduled task runs with timing

### Protecting the dashboard

Set `TELESCOPE_TOKEN` to restrict dashboard access. The token is accepted as a query string parameter or an `Authorization: Bearer` header.

```
GET /telescope?token=my-secret-token
Authorization: Bearer my-secret-token
```

### Ignored paths

Configure `ignoredPaths` to exclude health check or metrics endpoints from request recording.

## Config File

Create `config/telescope.config.ts`:

```ts
import { TelescopeConfig } from '@lara-node/telescope';

export default {
  enabled: true,
  path: '/telescope',
  token: process.env.TELESCOPE_TOKEN,

  watchers: {
    requests:   true,
    queries:    true,
    jobs:       true,
    cache:      true,
    logs:       true,
    exceptions: true,
    scheduler:  true,
  },

  pruneAfterHours: 48,
  maxEntries: 1000,

  ignoredPaths: [
    '/health',
    '/metrics',
    '/telescope',
  ],
} satisfies TelescopeConfig;
```

Load it in a service provider:

```ts
import { setConfig } from '@lara-node/core';
import telescopeConfig from '../config/telescope.config';

setConfig('telescope', telescopeConfig);
```

## Environment Variables

| Variable                 | Default      | Description                                               |
|--------------------------|--------------|-----------------------------------------------------------|
| `TELESCOPE_ENABLED`      | `true`       | Set to `false` to disable Telescope entirely              |
| `TELESCOPE_PATH`         | `/telescope` | URL path where the dashboard is mounted                   |
| `TELESCOPE_TOKEN`        | —            | Optional access token for dashboard protection            |
| `TELESCOPE_PRUNE_HOURS`  | `48`         | Hours before entries are automatically pruned             |
| `TELESCOPE_MAX_ENTRIES`  | `1000`       | Maximum number of entries held in memory                  |

## Notes

- All entry storage is in-process memory. Entries are lost on process restart. Telescope is not intended as a permanent audit log.
- Disable individual watchers in production to reduce overhead. The `queries` and `requests` watchers are the most resource-intensive.
- `TELESCOPE_ENABLED=false` makes `TelescopeServiceProvider` a complete no-op — no routes are mounted and no watchers are registered.
- The `AsyncContextMiddleware` from `@lara-node/middlewares` must be registered before Telescope's request watcher to correctly associate DB queries and cache operations with their originating request.
