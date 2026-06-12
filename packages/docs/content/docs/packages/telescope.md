# Telescope Package

The `@lara-node/telescope` package provides a beautiful debug dashboard for requests, queries, exceptions, and more.

## Installation

```bash
pnpm add @lara-node/telescope @lara-node/core express
```

## Overview

Features include:

- **Request monitoring** -- Log all HTTP requests
- **Query logging** -- Track database queries
- **Exception tracking** -- Log errors with stack traces
- **Cache monitoring** -- Track cache operations
- **Job monitoring** -- Track queue jobs
- **Schedule monitoring** -- Track scheduled tasks
- **Dark-mode SPA** dashboard

## Quick Start

Telescope is automatically registered when you install the `TelescopeServiceProvider`:

```typescript
import { TelescopeServiceProvider } from "@lara-node/telescope";

app.register(TelescopeServiceProvider);
```

Visit `/telescope` to access the dashboard.

## Key Exports

| Export                     | Description       |
| -------------------------- | ----------------- |
| `TelescopeStore`           | Entry store       |
| `TelescopeDashboard`       | HTTP dashboard    |
| `QueryWatcher`             | Query watcher     |
| `CacheWatcher`             | Cache watcher     |
| `TelescopeServiceProvider` | Auto-registration |

## Next Steps

- [Configuration](/packages/telescope/configuration) -- Configure Telescope
- [Watchers](/packages/telescope/watchers) -- Telescope watchers
