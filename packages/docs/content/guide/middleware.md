# Middleware

Middleware provides a convenient mechanism for filtering HTTP requests entering your application.

## Overview

LaraNode uses a Laravel-style middleware system with support for:

- Global middleware
- Middleware groups
- Route middleware (aliases)
- Priority middleware
- Terminable middleware

## Creating Middleware

Create a middleware class with a `handle` method:

```typescript
import { Request, Response, NextFunction } from "express";

export class AuthMiddleware {
  async handle(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    try {
      req.user = verifyToken(token);
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }
}
```

## Registering Middleware

### In a Provider

```typescript
import { MiddlewareServiceProvider } from "@lara-node/core";

export class HttpMiddlewareProvider extends MiddlewareServiceProvider {
  registerMiddleware() {
    return {
      aliases: {
        auth: AuthMiddleware,
        throttle: ThrottleMiddleware,
        admin: AdminMiddleware,
      },
      groups: {
        api: ["throttle:60,1", "auth"],
        web: ["session", "csrf"],
      },
      priority: ["throttle"],
    };
  }
}
```

### Global Middleware

Global middleware runs on every request:

```typescript
app.useGlobalMiddleware(CorsMiddleware);
```

## Using Middleware in Routes

### By Alias

```typescript
Route.get("/profile", UserController.profile).middleware("auth");
```

### Multiple Middleware

```typescript
Route.get("/admin", AdminController.index).middleware(["auth", "admin"]);
```

### Middleware Groups

```typescript
Route.group(() => {
  Route.get("/users", UserController.index);
  Route.post("/users", UserController.store);
}).middleware("api");
```

### Without Middleware

Remove middleware from a group:

```typescript
Route.group(() => {
  Route.get("/public", PublicController.index);
})
  .middleware("api")
  .withoutMiddleware("auth");
```

## Route Middleware Parameters

Pass parameters to middleware:

```typescript
Route.get("/api/data", DataController.index).middleware("throttle:60,1"); // 60 requests per 1 minute
```

## Priority Middleware

Priority middleware runs before other middleware:

```typescript
registerMiddleware() {
  return {
    priority: ['cors', 'throttle'],
  }
}
```

## Terminable Middleware

Terminable middleware can run after the response is sent:

```typescript
export class TerminatingMiddleware {
  async handle(req: Request, res: Response, next: NextFunction) {
    req.startTime = Date.now();
    next();
  }

  async terminate(req: Request, res: Response) {
    const duration = Date.now() - req.startTime;
    console.log(`Request took ${duration}ms`);
  }
}
```

## Built-in Middleware

LaraNode provides several built-in middleware:

| Middleware                   | Description           |
| ---------------------------- | --------------------- |
| `AuthMiddleware`             | JWT authentication    |
| `ThrottleMiddleware`         | Rate limiting         |
| `RequestLoggerMiddleware`    | Request logging       |
| `ErrorHandlerMiddleware`     | Error handling        |
| `ValidatorMiddleware`        | Request validation    |
| `ResponseExtenderMiddleware` | Auto-serialize models |

## Next Steps

- [Router Middleware](/packages/router/middleware) -- Route-level middleware
- [Built-in Middleware](/packages/middlewares/built-in) -- Pre-built middleware
- [Auth Middleware](/packages/auth/middleware) -- Authentication middleware
