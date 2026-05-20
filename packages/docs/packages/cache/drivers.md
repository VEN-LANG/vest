# Cache Drivers

LaraNode supports multiple cache drivers.

## Configuration

Set the driver via `CACHE_DRIVER` environment variable:

```dotenv
CACHE_DRIVER=file
```

Available drivers: `file`, `database`, `redis`

## File Cache

Stores cache in files on disk:

```dotenv
CACHE_DRIVER=file
CACHE_PATH=./storage/cache
```

```typescript
Cache.set('key', 'value', 3600)
Cache.get('key')
```

## Database Cache

Stores cache in a database table:

```dotenv
CACHE_DRIVER=database
```

```typescript
Cache.set('key', 'value', 3600)
Cache.get('key')
```

## Redis Cache

Stores cache in Redis:

```dotenv
CACHE_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

```typescript
Cache.set('key', 'value', 3600)
Cache.get('key')
```

## Cache Methods

```typescript
// Store
Cache.set('key', value, ttl)

// Get
Cache.get('key')
Cache.get('key', 'default')

// Delete
Cache.del('key')
Cache.forget('key')

// Check
Cache.has('key')

// Clear all
Cache.clear()
Cache.flush()

// Keys
Cache.keys()

// Remember
Cache.remember('key', ttl, async () => {
  return expensiveOperation()
})
```

## Prefix Management

```typescript
import { generateCacheKey, cacheDelPrefix } from '@lara-node/cache'

// Generate prefixed key
const key = generateCacheKey('users', userId)

// Delete all keys with prefix
await cacheDelPrefix('users:')
```

## Next Steps

- [Cache Overview](/packages/cache) -- Cache overview
- [Rate Limiting](/packages/cache/rate-limiting) -- Rate limiter
