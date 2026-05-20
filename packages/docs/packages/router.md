# Router Package

The `@lara-node/router` package provides an expressive routing system with a fluent builder, controller decorators, route model binding, and OpenAPI generation.

## Installation

```bash
pnpm add @lara-node/router @lara-node/core express reflect-metadata
```

## Overview

Features include:

- **Fluent route builder** with chainable methods
- **Controller decorators** for declarative routing
- **Route groups** with shared middleware and prefixes
- **Route model binding** for automatic model resolution
- **Resource routing** for RESTful controllers
- **Named routes** for URL generation
- **OpenAPI generation** from route metadata
- **Rate limiting** middleware

## Quick Start

```typescript
import { Route } from "@lara-node/router";

// Basic routes
Route.get("/users", UserController.index);
Route.post("/users", UserController.store);
Route.get("/users/:id", UserController.show);
Route.put("/users/:id", UserController.update);
Route.delete("/users/:id", UserController.destroy);
```

## Key Exports

| Export             | Description                     |
| ------------------ | ------------------------------- |
| `RouterBuilder`    | Fluent route builder            |
| `Route`            | Route decorator for controllers |
| `@Route()`         | Class decorator                 |
| `@Route.get()`     | Method decorator                |
| `@Bind()`          | Route model binding decorator   |
| `@Middleware()`    | Middleware alias decorator      |
| `Doc`              | OpenAPI documentation decorator |
| `OpenApiGenerator` | OpenAPI spec generator          |
| `HttpKernel`       | HTTP kernel base class          |

## Next Steps

- [Basic Routing](/packages/router/basic) -- Define routes
- [Route Groups](/packages/router/groups) -- Group routes
- [Controllers](/packages/router/controllers) -- Controller decorators
