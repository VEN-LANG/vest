# Built-in Middleware

LaraNode provides several pre-built middleware classes.

## AuthMiddleware

Validates JWT tokens from the `Authorization` header:

```typescript
import { AuthMiddleware } from '@lara-node/middlewares'

// Sets req.user with decoded token payload
Route.get('/profile', handler).middleware('auth')
```

## RequestLoggerMiddleware

Logs each request with details:

```typescript
import { RequestLoggerMiddleware } from '@lara-node/middlewares'

// Logs: method, URL, status, duration, IP, user
```

## ValidatorMiddleware

Attaches `req.validate()` method:

```typescript
import { ValidatorMiddleware } from '@lara-node/middlewares'

// In route handler
const data = req.validate({
  name: 'required|string',
  email: 'required|email',
})
```

## ResponseExtenderMiddleware

Auto-serializes Model instances in `res.json()`:

```typescript
import { ResponseExtenderMiddleware } from '@lara-node/middlewares'

// Automatically calls toJSONAsync() on Model instances
res.json(user) // Serialized JSON
```

## ErrorHandlerMiddleware

Handles errors and returns proper responses:

```typescript
import { ErrorHandlerMiddleware } from '@lara-node/middlewares'

// Returns 422 for ValidationError
// Returns 500 for other errors
```

## AsyncContextMiddleware

Sets up AsyncLocalStorage for request context:

```typescript
import { AsyncContextMiddleware, asyncLocalStorage } from '@lara-node/middlewares'

// Access request context anywhere
const store = asyncLocalStorage.getStore()
```

## Next Steps

- [Auth & Authorization](/packages/middlewares/auth) -- Auth middleware
- [Middlewares Overview](/packages/middlewares) -- Overview
- [Router Middleware](/packages/router/middleware) -- Route middleware
