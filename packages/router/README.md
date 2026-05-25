# @lara-node/router

Express router builder, route-model binding, middleware stack, controller decorators, and OpenAPI doc generator for [Lara-Node](https://github.com/venomous-maker/vest).

## Installation

```sh
pnpm add @lara-node/router
```

## Quick Start

```ts
import RouterBuilder from "@lara-node/router";

const router = new RouterBuilder();

router.group({ prefix: "/users", middleware: ["auth"] }, (g) => {
  g.get("/",      [UserController, "index"]);
  g.post("/",     [UserController, "store"]);
  g.get("/:user", [UserController, "show"]);    // :user resolved to User model
  g.put("/:user", [UserController, "update"]);
  g.delete("/:user", [UserController, "destroy"]);
});

export default router;
```

Mount in a service provider:

```ts
import { registerRouteBuilder } from "@lara-node/router";

registerRouteBuilder(router, "api", "/api", this.app);
```

---

## RouterBuilder

Fluent builder wrapping an Express `Router`.

### HTTP methods

```ts
router.get("/health",     healthHandler);
router.post("/users",     [UserController, "store"]);
router.put("/users/:id",  [UserController, "update"]);
router.patch("/users/:id",[UserController, "patch"]);
router.delete("/users/:id",[UserController, "destroy"]);
router.options("/users",  optionsHandler);
router.head("/users",     headHandler);
router.all("/ping",       pingHandler);          // all HTTP verbs
```

### Inline function handlers

```ts
router.get("/hello", (req, res) => {
  res.json({ message: "hello" });
});
```

---

## Route Groups

Group routes under a shared prefix, middleware, name namespace, or parameter constraints.

```ts
router.group({ prefix: "/admin", middleware: ["auth", "role:admin"] }, (g) => {
  g.get("/dashboard", [AdminController, "dashboard"]);
  g.get("/users",     [AdminController, "users"]);
});
```

Groups can be nested:

```ts
router.group({ prefix: "/api", middleware: ["throttle:60,1"] }, (g) => {
  g.group({ prefix: "/v1", name: "api.v1" }, (v1) => {
    v1.get("/users", [UserController, "index"]);
  });
  g.group({ prefix: "/v2", name: "api.v2" }, (v2) => {
    v2.get("/users", [UserController, "index"]);
  });
});
```

### Group options

| Option | Type | Description |
|---|---|---|
| `prefix` | `string` | URL prefix added to all routes in the group |
| `middleware` | `string \| string[]` | Middleware aliases applied to every route |
| `withoutMiddleware` | `string \| string[]` | Middleware to exclude from routes in this group |
| `name` | `string` | Name prefix prepended to every named route |
| `where` | `Record<string, string \| RegExp>` | Parameter constraints applied to all routes |

---

## Named Routes

```ts
router.name("users.show").get("/users/:user", [UserController, "show"]);

// Inside a named group
router.group({ name: "admin" }, (g) => {
  g.name("users.index").get("/users", [AdminController, "users"]);
  // full name: "admin.users.index"
});
```

---

## Parameter Constraints

Constrain route parameters to a regex pattern:

```ts
// Per-route
router.get("/users/:id", handler).where("id", /^\d+$/);
router.get("/posts/:slug", handler).where("slug", "[a-z0-9-]+");

// Multiple constraints at once
router.get("/archive/:year/:month", handler).where({ year: /\d{4}/, month: /\d{2}/ });

// Group-level constraints (apply to all routes in the group)
router.group({ prefix: "/users", where: { user: /\d+/ } }, (g) => {
  g.get("/:user", [UserController, "show"]);
});
```

---

## Route Model Binding

When a route parameter name matches a registered model, the framework automatically looks up the record and injects the model instance in place of the raw ID string. If the record is not found, a 404 is returned automatically via `findOrFail`.

### Register a model

**Option 1 — `@Bind` class decorator**

```ts
import { Model } from "@lara-node/db";
import { Bind } from "@lara-node/router";

@Bind()             // registers as "user" (class name, lowercased)
export class User extends Model {
  static table = "users";
}

@Bind("post")       // explicit binding name
export class BlogPost extends Model {
  static table = "posts";
}
```

**Option 2 — Static registration**

```ts
import { RouterBuilder } from "@lara-node/router";
import { User } from "./Models/User";

RouterBuilder.registerModel("user", User);
```

**Option 3 — Auto-scan a directory**

```ts
import { autoRegisterModels } from "@lara-node/router";
import path from "path";

// Loads all model files in the directory and registers any @Bind-decorated classes
await autoRegisterModels(path.resolve(__dirname, "../Models"));
```

### Default binding (by primary key)

```ts
// GET /users/42  → User.findOrFail("42")
router.get("/users/:user", (req, res) => {
  const user = req.params.user as unknown as User;
  res.json(user);
});
```

The model instance is injected into `req.params` and also passed as a positional argument to the handler:

```ts
router.get("/users/:user", (req, res, user: User) => {
  res.json(user);
});
```

### Custom field binding (`:param,field`)

Bind a model by a column other than the primary key using the `:param,field` syntax:

```ts
// GET /posts/my-slug  → Post.where("slug", "my-slug").first()
router.get("/posts/:post,slug", (req, res, post: Post) => {
  res.json(post);
});

// GET /users/alice@example.com  → User.where("email", value).first()
router.get("/users/:user,email", [UserController, "showByEmail"]);

// No field provided → uses the model's primaryKey (id by default)
router.get("/users/:user", [UserController, "show"]);
```

The `,field` hint is stripped from the path before it is registered with Express, so Express only sees `:user`.

### Explicit custom binder

For complex lookup logic, register a custom binder function:

```ts
router.model("post", async (slug: string, req) => {
  const post = await Post.where("slug", slug).with("author").first();
  if (!post) throw new Error("Post not found");
  return post;
});

router.get("/posts/:post", (req, res, post: Post) => {
  res.json(post);
});
```

### Disable automatic binding

```ts
router.enableAutoModelBinding(false);
```

---

## Resource Routes

```ts
// Registers: index, create, store, show, edit, update, destroy
router.resource("posts", PostController);

// API resource (no create/edit HTML routes)
router.apiResource("posts", PostController);
```

Generated routes for `router.resource("posts", PostController)`:

| Verb | URI | Action | Name |
|---|---|---|---|
| GET | `/posts` | index | `posts.index` |
| GET | `/posts/create` | create | `posts.create` |
| POST | `/posts` | store | `posts.store` |
| GET | `/posts/:post` | show | `posts.show` |
| GET | `/posts/:post/edit` | edit | `posts.edit` |
| PUT | `/posts/:post` | update | `posts.update` |
| DELETE | `/posts/:post` | destroy | `posts.destroy` |

### Resource options

```ts
router.resource("photos", PhotoController, {
  only:   ["index", "show", "store", "destroy"],     // limit actions
  except: ["create", "edit"],                         // exclude actions
  middleware: {
    store:   ["auth", "can:upload"],
    destroy: ["auth", "can:delete"],
  },
  where:      { photo: /\d+/ },
  parameters: { photo: "id" },                        // rename :photo → :id
});
```

---

## FormRequest Injection

If the first parameter of a controller method is typed as a `FormRequest` subclass, the router instantiates, validates, and injects it automatically before calling the method.

```ts
import { FormRequest } from "@lara-node/core";

class CreatePostRequest extends FormRequest<{ title: string; body: string }> {
  rules() {
    return {
      title: "required|string|min:3|max:255",
      body:  "required|string|min:10",
    };
  }
}

// Controller
async store(req: CreatePostRequest, res: Response) {
  const post = await Post.create(req.validated());
  return res.status(201).json({ data: post });
}
```

Validation errors are caught and returned as HTTP 422 with the error map.

---

## Controller Decorators

### `@Route(prefix, ...middleware)` / `@Controller(prefix?)`

```ts
import { Route } from "@lara-node/router";
import { Request, Response } from "express";

@Route("/api/users", "auth")
export class UserController {
  @Route.get("/")
  async index(req: Request, res: Response) {
    return res.json({ data: await User.all() });
  }

  @Route.post("/", "can:create_users")
  async store(req: Request, res: Response) {
    const user = await User.create(req.body);
    return res.status(201).json({ data: user });
  }

  @Route.get("/:user")
  async show(req: Request, res: Response, user: User) {
    return res.json({ data: user });
  }

  @Route.put("/:user", "can:update_users")
  async update(req: Request, res: Response, user: User) {
    await user.fill(req.body).save();
    return res.json({ data: user });
  }

  @Route.delete("/:user", "can:delete_users")
  async destroy(req: Request, res: Response, user: User) {
    await user.delete();
    return res.json({ success: true });
  }
}
```

Mount all decorated controllers at once:

```ts
const router = RouterBuilder.fromControllers();
this.app.mountRoutes("/", router.build());
```

Or add specific controllers:

```ts
const router = new RouterBuilder();
router.addController(UserController);
router.addController(PostController);
this.app.mountRoutes("/api", router.build());
```

### Individual HTTP decorators

```ts
import { Controller, Get, Post, Put, Patch, Delete } from "@lara-node/router";

@Controller("/api/posts")
export class PostController {
  @Get("/")          index(req: Request, res: Response) { /* ... */ }
  @Post("/")         store(req: Request, res: Response) { /* ... */ }
  @Get("/:post")     show(req: Request, res: Response, post: Post) { /* ... */ }
  @Put("/:post")     update(req: Request, res: Response, post: Post) { /* ... */ }
  @Patch("/:post")   patch(req: Request, res: Response, post: Post) { /* ... */ }
  @Delete("/:post")  destroy(req: Request, res: Response, post: Post) { /* ... */ }
}
```

---

## Middleware

### `@Middleware(alias)`

Registers a middleware class under a named alias at module load time.

```ts
import { Middleware } from "@lara-node/router";
import type { IMiddleware } from "@lara-node/router";
import type { Request, Response, NextFunction } from "express";

@Middleware("auth")
export class AuthMiddleware implements IMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" }) as any;
    // verify...
    next();
  }
}
```

### Manual registration

```ts
import { registerMiddleware, resolveMiddleware } from "@lara-node/router";

registerMiddleware("throttle", ThrottleMiddleware);
const handler = resolveMiddleware("throttle");
```

### Middleware stack (ServiceProvider)

```ts
import { ServiceProvider } from "@lara-node/core";

export class MiddlewareServiceProvider extends ServiceProvider {
  register(): void {}

  boot(): void {
    this.middlewareAliases({
      auth:  AuthMiddleware,
      can:   CanMiddleware,
      role:  RoleMiddleware,
      guest: GuestMiddleware,
    });

    this.middlewareGroup("api", ["throttle:120,1", "auth"]);
    this.middlewareGroup("web", ["session", "csrf"]);

    this.middlewarePriority(["auth", "can", "role"]);
  }
}
```

### Built-in throttle middleware

```ts
import { apiThrottle, userThrottle } from "@lara-node/router";

// Limit by IP
router.group({ middleware: [apiThrottle(60, 60)] }, (g) => {
  g.get("/public", publicHandler);
});

// Limit by authenticated user
router.group({ middleware: ["auth", userThrottle(1000, 60)] }, (g) => {
  g.get("/dashboard", dashboardHandler);
});
```

---

## OpenAPI Documentation

### `Doc` — inline route annotation

```ts
import { Doc } from "@lara-node/router";

router.get(
  "/users",
  [UserController, "index"],
  Doc.get("List all users")
    .tag("Users")
    .query("page", "integer", false, "Page number")
    .query("per_page", "integer", false, "Items per page")
    .response(200, "Paginated user list")
    .auth(),
);

router.post(
  "/users",
  [UserController, "store"],
  Doc.post("Create a new user")
    .tag("Users")
    .body({ name: "string", email: "string", password: "string" })
    .response(201, "User created")
    .response(422, "Validation error")
    .auth(),
);
```

### `OpenApiGenerator` — generate the spec

```ts
import { OpenApiGenerator } from "@lara-node/router";

const generator = new OpenApiGenerator(router);
const spec = generator.generate({
  title:   "My API",
  version: "1.0.0",
  servers: [{ url: "https://api.example.com" }],
});
```

### `DocServiceProvider` — Swagger UI at `/docs`

```ts
import { DocServiceProvider } from "@lara-node/router";

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.registerProvider(DocServiceProvider);
  }
}
```

### `RouteScanner` — scan controller directories

```ts
import { RouteScanner } from "@lara-node/router";
import path from "path";

const scanner = new RouteScanner();
await scanner.scan(path.resolve(__dirname, "../Controllers"));
```

Or from the CLI:

```sh
node artisan docs:generate
```

---

## `registerRouteBuilder(builder, source, prefix?, app?)`

Registers a builder for OpenAPI scanning and optionally mounts it in one call.

```ts
import { registerRouteBuilder } from "@lara-node/router";

registerRouteBuilder(apiRouter, "api", "/api", this.app);
registerRouteBuilder(webRouter, "web", "/",    this.app);
```

---

## Notes

- Route model binding calls `findOrFail(id)` by default — returns HTTP 404 if the record is not found.
- The `:param,field` syntax strips the `,field` hint before Express sees the path, so constraints, named routes, and everything else work as normal.
- `@Route` and `@Controller` decorators register routes in a global registry at module load time. The registry is consumed by `RouterBuilder.fromControllers()`.
- OpenAPI UI is only served when `DocServiceProvider` is registered.
- Middleware groups defined in `MiddlewareServiceProvider.boot()` are available by string alias anywhere in route definitions.
