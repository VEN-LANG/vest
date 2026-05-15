# @lara-node/middlewares

Predefined class-based middleware for Lara-Node applications. Every middleware is a plain class with a `handle()` method, keeping them testable and dependency-injectable.

## Installation

```bash
pnpm add @lara-node/middlewares
```

## Quick Setup

Register the core middleware stack in your Express app:

```typescript
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
app.use(requestLogger);      // colored request log
app.use(validatorAttach);    // attaches req.validate()
app.use(responseExtender);   // adds res.jsonAsync(), auto-serializes Models

// ... routes ...

app.use(errorHandler);       // 4-arg error handler (must be last)
```

## Middleware Reference

### AsyncContextMiddleware

Stores the request in `AsyncLocalStorage` so it's accessible anywhere in the call stack without prop-drilling:

```typescript
import { asyncLocalStorage } from '@lara-node/middlewares';

// Anywhere in the request lifecycle:
const store = asyncLocalStorage.getStore(); // { req, user? }
```

### RequestLoggerMiddleware

Logs `METHOD PATH STATUS TIME IP [user:id]` to stdout on response finish. Color-coded: green (2xx), yellow (4xx), red (5xx).

### ValidatorMiddleware

Attaches `req.validate()` to every request:

```typescript
// In any controller:
const data = await req.validate({
  name:  'required|string|min:2|max:100',
  email: 'required|email',
  age:   'required|integer|min:18',
});
```

Throws `ValidationError` (caught by `ErrorHandlerMiddleware` → HTTP 422) on failure.

### ResponseExtenderMiddleware

Adds `res.jsonAsync()` and overrides `res.json()` to automatically call `model.toJSONAsync()` on `@lara-node/db` Model instances (handles hidden fields, casts, relations):

```typescript
// All equivalent — Model is auto-serialized:
res.json(user);
res.json([user1, user2]);
res.json(await User.paginate(15, 1));   // QueryResult
await res.jsonAsync(user);
```

### AuthMiddleware

JWT authentication. Verifies `Authorization: Bearer <token>` and optionally loads the user from the database:

```typescript
import { AuthMiddleware } from '@lara-node/middlewares';

const auth = new AuthMiddleware({
  // Optional: load full user from DB (adds req.user with roles/permissions)
  userLoader: async (uid) => {
    const user = await User.with(['roles', 'roles.permissions']).find(uid);
    if (!user) return null;
    return {
      id: user.id,
      roles: user.roles.map(r => r.slug),
      permissions: user.roles.flatMap(r => r.permissions.map(p => p.slug)),
    };
  },
  // Optional: decrypt token before verification
  decryptToken: (token) => myDecrypt(token),
}).toHandler();

app.use('/api/protected', auth);
```

If no `userLoader` is provided, `req.user` is populated from the JWT payload (`{ id: sub, roles, permissions }`).

### AuthorizeByStatusMiddleware

Rejects requests where `req.user.status !== 'active'` or `req.user.isActive()` returns false:

```typescript
import { authorizeByStatus } from '@lara-node/middlewares';

app.use('/api/protected', auth, authorizeByStatus);
```

### ErrorHandlerMiddleware

Express 4-argument error handler. Handles:
- `ValidationError` → 422 with `{ success: false, errors, messages }`
- Any `err.status` (400–599) → that status code
- Everything else → 500
- `err.stack` included in non-production responses

```typescript
import { errorHandler } from '@lara-node/middlewares';
app.use(errorHandler); // must be registered last
```

## Authorization Helpers

```typescript
import { authorizeRoles, authorizePermissions } from '@lara-node/middlewares';

// Allow only admin or moderator:
router.get('/admin', auth, authorizeRoles('admin', 'moderator'), handler);

// Require a specific permission:
router.delete('/users/:id', auth, authorizePermissions('delete_users'), handler);
```

## Class-Based Usage

All middleware can also be used as classes (useful for testing or custom wiring):

```typescript
import { AuthMiddleware } from '@lara-node/middlewares';

// Class form:
const authMiddleware = new AuthMiddleware({ userLoader });
app.use(authMiddleware.handle.bind(authMiddleware));
// or:
app.use(authMiddleware.toHandler());
```

## Express Type Augmentation

This package augments the Express `Request` and `Response` interfaces globally:

```typescript
// req.user is typed:
req.user?.id          // number | string
req.user?.roles       // string[]
req.user?.permissions // string[]

// req.validate is typed:
const data = await req.validate<{ email: string }>(rules);

// res.jsonAsync is typed:
await res.jsonAsync(model);
```

You can also declare these locally in your project via `src/types/express.d.ts` — the `create-lara-node` scaffold generates this file automatically.

## Writing Custom Middleware

Follow the same class pattern:

```typescript
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

## Async Context Store

The store is populated by `AsyncContextMiddleware` and augmented by `AuthMiddleware`:

```typescript
import { asyncLocalStorage } from '@lara-node/middlewares';

function getCurrentUser() {
  return asyncLocalStorage.getStore()?.user ?? null;
}

function getCurrentRequest() {
  return asyncLocalStorage.getStore()?.req;
}
```

## License

MIT
