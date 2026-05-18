# @lara-node/middlewares

Built-in Express middleware classes — async context, request logging, validation, JWT auth, CORS, throttling, and RBAC guards.

## Installation

```sh
pnpm add @lara-node/middlewares
```

## Quick Start

```ts
import express from 'express';
import {
  asyncContext,
  requestLogger,
  validatorAttach,
  responseExtender,
  errorHandler,
} from '@lara-node/middlewares';

const app = express();

app.use(express.json());
app.use(asyncContext);       // async context per request
app.use(requestLogger);      // colorized request log
app.use(validatorAttach);    // attaches req.validate()
app.use(responseExtender);   // auto-serializes Model instances

// ... routes ...

app.use(errorHandler);       // must be last — handles ValidationError and other errors
```

## Middleware Reference

All middleware classes implement `handle(req, res, next)` and expose a `toHandler()` method that returns a bound Express handler.

### `AsyncContextMiddleware`

Wraps each request in an `AsyncLocalStorage` context so the request and authenticated user are accessible anywhere in the call stack without prop-drilling.

```ts
import { asyncLocalStorage } from '@lara-node/middlewares';

// Anywhere in the request lifecycle (services, repositories, etc.)
const store = asyncLocalStorage.getStore(); // { req, user? }

function getCurrentUser() {
  return asyncLocalStorage.getStore()?.user ?? null;
}
```

### `RequestLoggerMiddleware`

Colorized output on response finish: `METHOD PATH STATUS TIME IP [user:id]`. Green for 2xx, yellow for 4xx, red for 5xx.

### `ValidatorMiddleware`

Attaches `req.validate(rules)` to every request. Throws `ValidationError` on failure (caught by `ErrorHandlerMiddleware` → HTTP 422).

```ts
// In a controller
const data = await req.validate({
  name:  'required|string|min:2|max:100',
  email: 'required|email',
  age:   'required|integer|min:18',
});
```

### `ResponseExtenderMiddleware`

Adds `res.jsonAsync()` and overrides `res.json()` to automatically call `toJSONAsync()` on `@lara-node/db` Model instances, handling hidden fields, casts, and loaded relations.

```ts
res.json(user);                           // Model auto-serialized
res.json([user1, user2]);                 // array of Models
res.json(await User.paginate(15, 1));     // paginated result
await res.jsonAsync(user);                // explicit async path
```

### `AuthMiddleware`

Verifies `Authorization: Bearer <token>` using JWT and optionally loads the full user from the database.

```ts
import { AuthMiddleware } from '@lara-node/middlewares';

const auth = new AuthMiddleware({
  // Load full user with roles and permissions
  userLoader: async (uid) => {
    const user = await User.with(['roles', 'roles.permissions']).find(uid);
    if (!user) return null;
    return {
      id: user.id,
      roles: user.roles.map((r) => r.slug),
      permissions: user.roles.flatMap((r) => r.permissions.map((p) => p.slug)),
    };
  },
  // Optional: decrypt token before verification
  decryptToken: (token) => myDecrypt(token),
}).toHandler();

app.use('/api', auth);
```

When `userLoader` is not provided, `req.user` is populated directly from the JWT payload.

### `JwtMiddleware`

Lighter JWT middleware — verifies `Authorization: Bearer <token>` using `JWT_SECRET` and sets `req.user` from the decoded payload. No database lookup.

```ts
import { JwtMiddleware } from '@lara-node/middlewares';

app.use('/api', new JwtMiddleware().toHandler());
```

### `AuthorizeByStatusMiddleware`

Rejects requests where the authenticated user's status is not `active`.

```ts
import { authorizeByStatus } from '@lara-node/middlewares';

app.use('/api/protected', auth, authorizeByStatus);
```

### `CorsMiddleware`

Wraps the `cors` npm package.

```ts
import { CorsMiddleware } from '@lara-node/middlewares';

app.use(new CorsMiddleware({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}).toHandler());
```

### `ThrottleMiddleware`

Rate-limit middleware using the `@lara-node/cache` `RateLimiter`.

```ts
import { ThrottleMiddleware } from '@lara-node/middlewares';

// 60 requests per 60 seconds per IP
app.use('/api', new ThrottleMiddleware({ maxAttempts: 60, decaySeconds: 60 }).toHandler());
```

### `RoleMiddleware` and `PermissionMiddleware`

RBAC guards that inspect `req.user.roles` and `req.user.permissions`.

```ts
import { authorizeRoles, authorizePermissions } from '@lara-node/middlewares';

// Allow admin or moderator roles
router.get('/admin', auth, authorizeRoles('admin', 'moderator'), handler);

// Require a specific permission
router.delete('/users/:id', auth, authorizePermissions('delete_users'), handler);
```

Or use the class form:

```ts
import { RoleMiddleware, PermissionMiddleware } from '@lara-node/middlewares';

router.get('/admin', auth, new RoleMiddleware('admin').toHandler(), handler);
router.delete('/users/:id', auth, new PermissionMiddleware('delete_users').toHandler(), handler);
```

### `ErrorHandlerMiddleware`

Express 4-argument error handler. Handles:

- `ValidationError` — HTTP 422 with `{ success: false, errors, messages }`
- `err.status` present — responds with that status code
- All others — HTTP 500

Stack trace is included in non-production responses.

```ts
import { errorHandler } from '@lara-node/middlewares';

app.use(errorHandler); // must be registered after all routes
```

## Registering middleware aliases

```ts
import { registerMiddleware } from '@lara-node/core';
import { JwtMiddleware, ThrottleMiddleware } from '@lara-node/middlewares';

registerMiddleware('auth', JwtMiddleware);
registerMiddleware('throttle', ThrottleMiddleware);
```

Or use the `@Middleware('alias')` decorator on the class:

```ts
import { Middleware } from '@lara-node/middlewares';

@Middleware('auth')
export class JwtMiddleware { ... }
```

## Writing custom middleware

```ts
import { Request, Response, NextFunction } from 'express';

export class MaintenanceModeMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    if (process.env.MAINTENANCE === 'true') {
      res.status(503).json({ message: 'Service temporarily unavailable.' });
      return;
    }
    next();
  }

  toHandler() {
    return (req: Request, res: Response, next: NextFunction) =>
      this.handle(req, res, next);
  }
}
```

## Express type augmentation

This package augments the Express `Request` and `Response` interfaces globally:

```ts
req.user?.id           // number | string
req.user?.roles        // string[]
req.user?.permissions  // string[]

const data = await req.validate<{ email: string }>(rules);
await res.jsonAsync(model);
```

The `create-lara-node` scaffold generates a `src/types/express.d.ts` file with these augmentations automatically.

## Environment Variables

| Variable     | Default | Description                                      |
|--------------|---------|--------------------------------------------------|
| `JWT_SECRET` | —       | Secret key used by `JwtMiddleware` to verify JWTs|
