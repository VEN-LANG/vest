---
name: laranode-telescope
description: >-
  Debug dashboard for requests, queries, exceptions, cache operations, queue jobs,
  and scheduled tasks. Dark-mode SPA with real-time monitoring.
  Activates for questions about TelescopeServiceProvider, TelescopeStore,
  TelescopeDashboard, QueryWatcher, or CacheWatcher.
---

# @lara-node/telescope

Beautiful debug dashboard for requests, queries, exceptions, and more.

## Key Exports

| Export | Description |
|--------|-------------|
| `TelescopeStore` | Entry storage and pruning |
| `TelescopeDashboard` | HTTP dashboard |
| `QueryWatcher` | Database query monitoring |
| `CacheWatcher` | Cache operation monitoring |
| `TelescopeServiceProvider` | Auto-registration |

## Quick Start

```typescript
import { TelescopeServiceProvider } from "@lara-node/telescope";

app.register(TelescopeServiceProvider);
// Dashboard available at /telescope
```

## Features

- **Request monitoring** — Log all HTTP requests with duration
- **Query logging** — Track database queries with EXPLAIN
- **Exception tracking** — Log errors with full stack traces
- **Cache monitoring** — Track get/set/del operations
- **Job monitoring** — Track queue job lifecycle
- **Schedule monitoring** — Track scheduled task executions
- **Dark-mode SPA** dashboard
