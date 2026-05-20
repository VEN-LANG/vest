# Cache Package

The `@lara-node/cache` package provides multi-driver caching with rate limiting support.

## Installation

```bash
pnpm add @lara-node/cache @lara-node/core
```

## Overview

Features include:

- **Multiple drivers** -- File, Database, Redis
- **Rate limiting** -- Laravel-style rate limiter
- **Cache prefix** management
- **Remember pattern** for caching queries
- **Telescope integration**

## Quick Start

```typescript
import { Cache } from "@lara-node/cache";

// Store
Cache.set("key", "value", 3600); // 1 hour

// Get
const value = Cache.get("key");

// Get with default
const value = Cache.get("key", "default");

// Remember (get or set)
const users = Cache.remember("users", 3600, async () => {
  return User.all();
});

// Delete
Cache.del("key");

// Check exists
Cache.has("key");
```

## Key Exports

| Export         | Description          |
| -------------- | -------------------- |
| `Cache`        | Cache facade         |
| `CacheManager` | Cache driver manager |
| `RateLimiter`  | Rate limiter facade  |
| `FileCache`    | File-based cache     |
| `DBCache`      | Database cache       |
| `RedisCache`   | Redis cache          |

## Configuration

```typescript
// config/cache.config.ts
export default {
  driver: process.env.CACHE_DRIVER || "file",
  prefix: process.env.CACHE_PREFIX || "vest_",
  path: process.env.CACHE_PATH || "./storage/cache",
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
  },
};
```

## Next Steps

- [Cache Drivers](/packages/cache/drivers) -- File, DB, Redis
- [Rate Limiting](/packages/cache/rate-limiting) -- Rate limiter
