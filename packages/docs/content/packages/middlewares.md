# Middlewares Package

The `@lara-node/middlewares` package provides pre-built middleware for common use cases.

## Installation

```bash
pnpm add @lara-node/middlewares @lara-node/core express
```

## Overview

Includes middleware for:

- **Authentication** -- JWT validation
- **Authorization** -- Role and permission checks
- **Request logging** -- Structured request logs
- **Error handling** -- Unified error responses
- **Validation** -- Request validation helper
- **Response extension** -- Auto-serialize models
- **Async context** -- Request-scoped storage

## Quick Start

```typescript
import {
  AuthMiddleware,
  RequestLoggerMiddleware,
  ErrorHandlerMiddleware,
  ValidatorMiddleware,
  ResponseExtenderMiddleware,
} from "@lara-node/middlewares";

export class MiddlewareProvider extends MiddlewareServiceProvider {
  registerMiddleware() {
    return {
      aliases: {
        auth: AuthMiddleware,
        logger: RequestLoggerMiddleware,
        validator: ValidatorMiddleware,
        errorHandler: ErrorHandlerMiddleware,
      },
      groups: {
        api: ["errorHandler", "logger", "validator", "auth"],
      },
      priority: ["errorHandler"],
    };
  }
}
```

## Key Exports

| Export                        | Description              |
| ----------------------------- | ------------------------ |
| `AuthMiddleware`              | JWT authentication       |
| `RequestLoggerMiddleware`     | Request logging          |
| `ValidatorMiddleware`         | Request validation       |
| `ResponseExtenderMiddleware`  | Auto-serialize models    |
| `ErrorHandlerMiddleware`      | Error handling           |
| `AuthorizeByStatusMiddleware` | Status check             |
| `authorizeRoles()`            | Role authorization       |
| `authorizePermissions()`      | Permission authorization |
| `AsyncContextMiddleware`      | AsyncLocalStorage        |

## Next Steps

- [Built-in Middleware](/packages/middlewares/built-in) -- All middleware
- [Auth & Authorization](/packages/middlewares/auth) -- Auth middleware
- [Router Middleware](/packages/router/middleware) -- Route middleware
