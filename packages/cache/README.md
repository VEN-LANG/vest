# @lara-node/cache

Multi-driver cache system (file, database, Redis) with AES-256-CBC encryption, prefix support, TTL, and a rate limiter.

## Installation

```sh
pnpm add @lara-node/cache
```

## Quick Start

```ts
import { Cache } from '@lara-node/cache';

await Cache.set('user:1', { name: 'Alice' }, 300); // TTL 5 min
const user = await Cache.get('user:1');            // { name: 'Alice' }
await Cache.del('user:1');

// Remember pattern — fetch-and-cache
const result = await Cache.remember('expensive:query', 60, async () => {
  return db.query('SELECT ...');
});
```

## Drivers

| Driver     | Description                                      |
|------------|--------------------------------------------------|
| `file`     | JSON files under `storage/cache/` (default)      |
| `database` | Uses the configured DB via `@lara-node/db`        |
| `redis`    | Redis via `ioredis`                              |

Set the driver with `CACHE_DRIVER`.

## API

### `Cache` facade

All methods are async.

```ts
import { Cache } from '@lara-node/cache';

await Cache.get(key);                       // retrieve value or null
await Cache.set(key, value, ttlSeconds?);   // store value
await Cache.del(key);                       // delete one key
await Cache.has(key);                       // boolean existence check
await Cache.clear();                        // delete all keys (current prefix)
await Cache.keys();                         // list all keys
await Cache.forget(key);                    // alias for del
await Cache.flush();                        // alias for clear
await Cache.remember(key, ttl, callback);   // get or set via callback
```

### `generateCacheKey(...parts)`

Builds a colon-joined cache key from multiple parts.

```ts
import { generateCacheKey } from '@lara-node/cache';

const key = generateCacheKey('users', userId, 'profile'); // "users:42:profile"
```

### `cacheGet`, `cacheSet`, `cacheDel`, `cacheHas`, `cacheClear`, `cacheDelPrefix`

Standalone helper functions with the same signatures as the facade methods. `cacheDelPrefix(prefix)` deletes all keys beginning with the given prefix.

```ts
import { cacheSet, cacheGet, cacheDelPrefix } from '@lara-node/cache';

await cacheSet('session:abc', data, 1800);
await cacheGet('session:abc');
await cacheDelPrefix('session:');
```

### `RateLimiter`

```ts
import { RateLimiterFacade } from '@lara-node/cache';

const limiter = RateLimiterFacade.for('api');

// Allow 60 requests per minute per IP
app.use(async (req, res, next) => {
  const key = `throttle:${req.ip}`;
  const hit = await limiter.hit(key, 60);   // increment, window = 60 s
  if (await limiter.tooManyAttempts(key, 60)) {
    return res.status(429).json({ message: 'Too Many Requests' });
  }
  next();
});

await limiter.clear(key);                   // reset on successful auth
```

### `CacheServiceProvider`

Register the cache in the IoC container:

```ts
import { Application } from '@lara-node/core';
import { CacheServiceProvider } from '@lara-node/cache';

const app = new Application();
app.register(CacheServiceProvider);
await app.boot();
```

### Direct driver access

```ts
import { FileCache, DBCache, RedisCache, CacheManager } from '@lara-node/cache';

// Use a specific driver directly
const redis = new RedisCache({ host: 'localhost', port: 6379 });
await redis.set('key', 'value', 120);
```

## File Driver

Keys are stored as individual JSON files under `<cwd>/storage/cache/`. Each file is named after the URL-encoded prefixed key and contains the value plus expiry metadata. Expired files are deleted on next access.

## Environment Variables

| Variable         | Default                  | Description                                               |
|------------------|--------------------------|-----------------------------------------------------------|
| `CACHE_DRIVER`   | `file`                   | Active driver: `file`, `database`, or `redis`             |
| `CACHE_PATH`     | `storage/cache`          | Directory for file driver (relative to `process.cwd()`)   |
| `CACHE_PREFIX`   | `$APP_NAME` or `app`     | Prefix prepended to all cache keys                        |
| `APP_KEY`        | —                        | When set, values are AES-256-CBC encrypted at rest        |
| `APP_NAME`       | —                        | Used as prefix fallback when `CACHE_PREFIX` is unset      |
| `REDIS_URL`      | —                        | Full Redis connection URL (e.g. `redis://:pass@host:6379`) |
| `REDIS_HOST`     | `127.0.0.1`              | Redis host (used when `REDIS_URL` is not set)             |
| `REDIS_PORT`     | `6379`                   | Redis port                                                |
| `REDIS_PASSWORD` | —                        | Redis password                                            |

## Notes

- When `APP_KEY` is present all cached values are transparently encrypted before write and decrypted on read. The driver itself stores only the ciphertext.
- The `remember` helper is atomic per-process but not distributed. For distributed locking use a Redis driver and implement an application-level lock.
- `cacheDelPrefix` is only fully supported by the file driver and Redis driver. The database driver performs a `LIKE` query on the key column.
