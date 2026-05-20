# Rate Limiting

LaraNode provides a Laravel-style rate limiter for controlling request frequency.

## Basic Usage

```typescript
import { RateLimiter } from '@lara-node/cache'

const key = `api:${req.ip}`

if (RateLimiter.tooManyAttempts(key, 60)) {
  return res.status(429).json({ error: 'Too many requests' })
}

RateLimiter.hit(key, 60)
```

## RateLimiter Methods

```typescript
// Check if too many attempts
RateLimiter.tooManyAttempts(key, maxAttempts, decaySeconds)

// Record an attempt
RateLimiter.hit(key, decaySeconds)

// Get attempt count
RateLimiter.attempts(key)

// Clear attempts
RateLimiter.clear(key)

// Attempt and check in one call
const allowed = RateLimiter.attempt(key, maxAttempts, decaySeconds)
```

## Named Limiters

Define reusable limiters:

```typescript
import { defineRateLimiter, getNamedLimiter } from '@lara-node/cache'

defineRateLimiter('api', { maxAttempts: 60, decaySeconds: 60 })
defineRateLimiter('login', { maxAttempts: 5, decaySeconds: 300 })

// Usage
const limiter = getNamedLimiter('api')
if (limiter.tooManyAttempts(key)) {
  // Rate limited
}
```

## In Middleware

```typescript
import { RateLimitExceededException } from '@lara-node/cache'

export class ThrottleMiddleware {
  async handle(req, res, next) {
    const key = `api:${req.ip}`

    if (!RateLimiter.attempt(key, 60, 60)) {
      throw new RateLimitExceededException()
    }

    next()
  }
}
```

## Route-Level Throttling

```typescript
Route.get('/api/data', DataController.index)
  .middleware('throttle:60,1') // 60 per minute
```

## Next Steps

- [Cache Drivers](/packages/cache/drivers) -- Cache drivers
- [Cache Overview](/packages/cache) -- Cache overview
- [Middleware](/packages/middlewares) -- Built-in middleware
