# Basic Routing

Define routes using the fluent `Route` builder.

## Basic Routes

```typescript
import { Route } from "@lara-node/router";

Route.get("/hello", () => "Hello World");
Route.post("/users", UserController.store);
Route.put("/users/:id", UserController.update);
Route.patch("/users/:id", UserController.patch);
Route.delete("/users/:id", UserController.destroy);
Route.options("/users", UserController.options);
Route.head("/users", UserController.head);
```

## Multiple Methods

```typescript
Route.match(["GET", "POST"], "/endpoint", handler);
Route.any("/endpoint", handler);
```

## Route Parameters

```typescript
Route.get("/users/:id", (req) => {
  return User.find(req.params.id);
});

Route.get("/posts/:postId/comments/:commentId", (req) => {
  // req.params.postId
  // req.params.commentId
});
```

## Named Routes

```typescript
Route.get("/users/profile", UserController.profile).name("profile");

// Generate URL
const url = Route.route("profile"); // '/users/profile'
```

## Route Constraints

```typescript
Route.get("/users/:id", UserController.show).where("id", "[0-9]+");

Route.get("/posts/:slug", PostController.show).where("slug", "[a-z0-9-]+");
```

## Redirect Routes

```typescript
Route.redirect("/old-route", "/new-route");
Route.permanentRedirect("/old-route", "/new-route");
```

## Fallback Route

```typescript
Route.fallback(() => {
  return "404 - Not Found";
});
```

## Next Steps

- [Route Groups](/packages/router/groups) -- Group routes
- [Controllers](/packages/router/controllers) -- Controller decorators
- [Middleware](/packages/router/middleware) -- Route middleware
