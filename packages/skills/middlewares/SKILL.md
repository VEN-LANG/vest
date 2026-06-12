---
name: @lara-node/middlewares — Pre-Built HTTP Middleware
description: >-
  Pre-built Express middleware for authentication (JWT), authorization (roles/permissions),
  request logging, error handling, validation, response extension, and async context.
  Activates for questions about AuthMiddleware, RequestLoggerMiddleware,
  ErrorHandlerMiddleware, ValidatorMiddleware, ResponseExtenderMiddleware,
  authorizeRoles(), authorizePermissions(), or AsyncContextMiddleware.
---

# @lara-node/middlewares

Pre-built Express middleware for common HTTP concerns.

## Key Exports

| Export | Description |
|--------|-------------|
| `AuthMiddleware` | JWT authentication |
| `RequestLoggerMiddleware` | Request logging |
| `ValidatorMiddleware` | Request validation |
| `ResponseExtenderMiddleware` | Auto-serialize models |
| `ErrorHandlerMiddleware` | Unified error responses |
| `AuthorizeByStatusMiddleware` | Status-based authorization |
| `authorizeRoles(...roles)` | Role-based authorization |
| `authorizePermissions(...perms)` | Permission-based authorization |
| `AsyncContextMiddleware` | AsyncLocalStorage context |

## Quick Start

```typescript
import { AuthMiddleware, RequestLoggerMiddleware, ErrorHandlerMiddleware } from "@lara-node/middlewares";
import { MiddlewareServiceProvider } from "@lara-node/core";

export class MiddlewareProvider extends MiddlewareServiceProvider {
  registerMiddleware() {
    return {
      aliases: {
        auth: AuthMiddleware,
        logger: RequestLoggerMiddleware,
        errorHandler: ErrorHandlerMiddleware,
      },
      groups: {
        api: ["errorHandler", "logger", "auth"],
      },
      priority: ["errorHandler"],
    };
  }
}
```

## Authorization

```typescript
import { authorizeRoles } from "@lara-node/middlewares";

@Route.get("/admin")
@Middleware(authorizeRoles("admin"))
async adminOnly() { /* ... */ }
```
