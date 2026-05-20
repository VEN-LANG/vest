# Telescope Watchers

Watchers monitor different aspects of your application.

## Entry Types

Telescope records these entry types:

| Type        | Description           |
| ----------- | --------------------- |
| `request`   | HTTP requests         |
| `exception` | Errors and exceptions |
| `query`     | Database queries      |
| `cache`     | Cache operations      |
| `job`       | Queue jobs            |
| `schedule`  | Scheduled tasks       |
| `log`       | Log entries           |

## QueryWatcher

Watches database queries via `db:query` events:

```typescript
import { QueryWatcher } from "@lara-node/telescope";

// Automatically logs all queries
```

## CacheWatcher

Watches cache operations:

```typescript
import { CacheWatcher } from "@lara-node/telescope";
import { setCacheWatchHook } from "@lara-node/cache";

// Hook is set automatically by TelescopeServiceProvider
```

## Recording Entries

```typescript
import { TelescopeStore } from "@lara-node/telescope";

const store = new TelescopeStore();

store.record("request", {
  method: "GET",
  url: "/api/users",
  status: 200,
});

store.record("exception", {
  message: error.message,
  stack: error.stack,
});
```

## Querying Entries

```typescript
// Get entries
const entries = store.getEntries({
  type: "request",
  tag: "api",
  limit: 50,
});

// Get single entry
const entry = store.getEntry(id);

// Stats
const stats = store.stats();

// Clear
store.clear();
```

## Metric Buckets

```typescript
// Per-minute request metrics
const requests = store.getRequestBucket();
const queries = store.getQueryBucket();
```

## Next Steps

- [Telescope Overview](/packages/telescope) -- Overview
- [Configuration](/packages/telescope/configuration) -- Configure Telescope
- [Horizon](/packages/horizon) -- Queue monitoring
