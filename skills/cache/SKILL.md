---
name: cache
description: >-
  Cache facade with File, Database, and Redis drivers plus Laravel-style rate limiter.
  Activates for questions about Cache.get/set/del/remember/has, CacheManager,
  RateLimiter, FileCache, DBCache, or RedisCache.
---

# @lara-node/cache

Multi-driver caching (File, Database, Redis) with Laravel-style rate limiting.

## Key Exports

| Export | Description |
|--------|-------------|
| `Cache` | Cache facade |
| `CacheManager` | Cache driver manager |
| `RateLimiter` | Rate limiter facade |
| `FileCache` | File-based cache driver |
| `DBCache` | Database cache driver |
| `RedisCache` | Redis cache driver |

## Quick Start

```typescript
import { Cache } from "@lara-node/cache";

Cache.set("key", "value", 3600);
const value = Cache.get("key", "default");

const users = Cache.remember("users", 3600, async () => {
  return await User.all();
});

Cache.del("key");
Cache.has("key");
```

## Rate Limiting

```typescript
import { RateLimiter } from "@lara-node/cache";

const limited = await RateLimiter.attempt("login:1", 5, 60);
if (!limited) {
  throw new Error("Too many attempts");
}
```
