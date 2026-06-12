---
name: router
description: >-
  Express routing with fluent builder, controller decorators, route model binding,
  groups, resource routing, and OpenAPI generation. Activates for questions about
  Route.get/post/put/delete, @Route decorator, @Bind, @Middleware, or OpenAPI spec generation.
---

# @lara-node/router

Expressive routing system with fluent builder, controller decorators, route model binding, and OpenAPI generation.

## Key Exports

| Export | Description |
|--------|-------------|
| `Route` | Route decorator for controllers |
| `@Route()` | Class-level path decorator |
| `@Route.get()`, `@Route.post()`, etc. | Method decorators |
| `@Bind()` | Route model binding decorator |
| `@Middleware()` | Middleware alias decorator |
| `Doc` | OpenAPI documentation decorator |
| `OpenApiGenerator` | OpenAPI spec generator |
| `HttpKernel` | HTTP kernel base class |

## Quick Start

```typescript
import { Route } from "@lara-node/router";

Route.get("/users", UserController.index);
Route.post("/users", UserController.store);
Route.get("/users/:id", UserController.show);
Route.put("/users/:id", UserController.update);
Route.delete("/users/:id", UserController.destroy);
```

## Controller Decorators

```typescript
import { Route, Bind } from "@lara-node/router";

@Route("/api/users")
class UserController {
  @Route.get("/")
  async index() {
    return User.all();
  }

  @Route.get("/:id")
  @Bind("id", User)
  async show(req: Request) {
    return req.user;
  }
}
```

## Route Groups

```typescript
Route.group({ prefix: "/admin", middleware: ["auth", "admin"] }, () => {
  Route.get("/dashboard", AdminController.dashboard);
  Route.resource("/users", AdminUserController);
});
```

## OpenAPI Generation

```typescript
import { Doc, OpenApiGenerator } from "@lara-node/router";

class UserController {
  @Doc({
    summary: "List all users",
    tags: ["Users"],
    responses: { 200: { description: "List of users" } },
  })
  @Route.get("/")
  async index() { /* ... */ }
}
```
