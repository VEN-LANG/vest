# @lara-node/router

Express router builder, middleware stack, OpenAPI doc generator, route-model binding, and controller decorators for [Lara-Node](https://github.com/venomous-maker/vest).

## Installation

```sh
pnpm add @lara-node/router
```

## Quick Start

```ts
import RouterBuilder from '@lara-node/router';

const router = new RouterBuilder();

router.group({ prefix: '/users', middleware: ['auth'] }, (g) => {
  g.get('/',       [UserController, 'index']);
  g.post('/',      [UserController, 'store']);
  g.get('/:user',  [UserController, 'show']);   // :user bound to User model
  g.put('/:user',  [UserController, 'update']);
  g.delete('/:user', [UserController, 'destroy']);
});

export const routesBuilder = router;
```

Mount in a service provider:

```ts
import { registerRouteBuilder } from '@lara-node/router';

registerRouteBuilder(routesBuilder, 'api', '/api', this.app);
```

## Route Builder

### `RouterBuilder`

Fluent router builder that wraps an Express `Router`.

```ts
import RouterBuilder from '@lara-node/router';

const router = new RouterBuilder();

// Single routes
router.get('/health', healthHandler);
router.post('/users', [UserController, 'store']);
router.put('/users/:id', [UserController, 'update']);
router.patch('/users/:id', [UserController, 'update']);
router.delete('/users/:id', [UserController, 'destroy']);

// Group with prefix and middleware
router.group({ prefix: '/admin', middleware: ['auth', 'role:admin'] }, (g) => {
  g.get('/users', [AdminController, 'listUsers']);
  g.delete('/users/:user', [AdminController, 'deleteUser']);
});

// Resourceful routes
router.resource('posts', PostController);
// Registers: index, show, store, update, destroy

// API resource (no create/edit HTML routes)
router.apiResource('posts', PostController);

// Route-model binding registration
router.registerModel('user', User);

// Get the Express Router
const expressRouter = router.getRouter();
// or router.build()
```

### `registerRouteBuilder(builder, source, prefix?, app?)`

Registers a builder for OpenAPI scanning and optionally mounts it in a single call.

```ts
import { registerRouteBuilder } from '@lara-node/router';

// Scan and mount in one call
registerRouteBuilder(apiRouter, 'api', '/api', this.app);
registerRouteBuilder(webRouter, 'web', '/', this.app);
```

## Controller Decorators

### `@Route(prefix, ...classMiddleware)`

Defines the base path and class-level middleware for a controller. Apply `@Route.get`, `@Route.post`, etc. on individual methods.

```ts
import { Route } from '@lara-node/router';
import { Request, Response } from 'express';

@Route('/api/users', 'auth')
export class UserController {

  @Route.get('/')
  async index(req: Request, res: Response) {
    const users = await User.all();
    res.json({ data: users });
  }

  @Route.post('/', 'can:create_users')
  async store(req: Request, res: Response) {
    const user = await User.create(req.body);
    res.status(201).json({ data: user });
  }

  @Route.get('/:user')
  async show(req: Request, res: Response) {
    const user = req.params.user as unknown as User;
    res.json({ data: user });
  }

  @Route.put('/:user', 'can:update_users')
  async update(req: Request, res: Response) {
    const user = req.params.user as unknown as User;
    await user.fill(req.body as Record<string, unknown>).save();
    res.json({ data: user });
  }

  @Route.delete('/:user', 'can:delete_users')
  async destroy(req: Request, res: Response) {
    const user = req.params.user as unknown as User;
    await user.delete();
    res.json({ success: true });
  }
}
```

Mount all registered controllers at once:

```ts
const router = RouterBuilder.fromControllers();
this.app.mountRoutes('/', router.build());
```

Or mount specific controllers:

```ts
const router = new RouterBuilder();
router.addController(UserController);
router.addController(AuthController);
this.app.mountRoutes('/api', router.build());
```

### `@Controller(prefix?)`, `@Get(path)`, `@Post(path)`, etc.

Alias decorators for the same functionality:

```ts
import { Controller, Get, Post, Put, Delete } from '@lara-node/router';

@Controller('/api/posts')
export class PostController {
  @Get('/')
  index(req: Request, res: Response) { /* ... */ }

  @Post('/')
  store(req: Request, res: Response) { /* ... */ }

  @Put('/:id')
  update(req: Request, res: Response) { /* ... */ }

  @Delete('/:id')
  destroy(req: Request, res: Response) { /* ... */ }
}
```

## Route-Model Binding

### `@Bind(name?)`

Registers a Model for automatic loading when a matching route parameter is present. The model instance is injected into `req.params` in place of the raw ID.

```ts
import { Model } from '@lara-node/db';
import { Bind } from '@lara-node/router';

@Bind()           // registers as 'user' (class name lowercased)
export class User extends Model {}

@Bind('post')     // explicit binding name
export class BlogPost extends Model {}
```

The `@Bind` decorator fires when the module is first loaded. Use `autoRegisterModels()` in your service provider to load all model files at startup:

```ts
import { autoRegisterModels } from '@lara-node/router';
import path from 'path';

await autoRegisterModels(path.resolve(__dirname, '../Models'));
```

In the route handler:

```ts
router.get('/users/:user', async (req, res) => {
  const user = req.params.user as unknown as User;  // already loaded from DB
  res.json(user);
});
```

## Middleware

### `@Middleware(alias)`

Registers a middleware class under a named alias. Importing the file is enough to trigger registration.

```ts
import { Middleware } from '@lara-node/router';
import type { IMiddleware } from '@lara-node/router';
import type { Request, Response, NextFunction } from 'express';

@Middleware('auth')
export class AuthMiddleware implements IMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    // verify token...
    next();
  }
}
```

### `registerMiddleware(alias, cls)` / `resolveMiddleware(alias)`

Manual registration and resolution:

```ts
import { registerMiddleware, resolveMiddleware } from '@lara-node/router';

registerMiddleware('throttle', ThrottleMiddleware);
const handler = resolveMiddleware('throttle');
```

### Middleware stack

```ts
import { middlewareStack } from '@lara-node/router';

middlewareStack.alias('auth', authMiddleware);
middlewareStack.group('api', ['throttle:120,1', 'auth']);
middlewareStack.setPriority(['auth', 'can', 'role']);
```

## OpenAPI Doc Generation

### `Doc` builder

Annotate routes inline with OpenAPI metadata:

```ts
import { Doc } from '@lara-node/router';

router.get(
  '/users',
  [UserController, 'index'],
  Doc.get('List users')
     .tag('Users')
     .response(200, 'User list')
     .auth(),
);
```

### `OpenApiGenerator`

Generate a full OpenAPI 3.x spec from all registered routes:

```ts
import { OpenApiGenerator } from '@lara-node/router';

const generator = new OpenApiGenerator(router);
const spec = generator.generate({ title: 'My API', version: '1.0.0' });
```

### `DocServiceProvider`

Mounts a Swagger UI at `/docs`:

```ts
import { DocServiceProvider } from '@lara-node/router';

app.register(DocServiceProvider);
```

### `RouteScanner`

Scans controller directories to discover routes:

```ts
import { RouteScanner } from '@lara-node/router';

const scanner = new RouteScanner();
await scanner.scan(path.resolve(__dirname, '../Controllers'));
```

Generate from the CLI:

```sh
node artisan docs:generate
```

## Notes

- Route-model binding calls `Model.findOrFail(id)` — it returns HTTP 404 automatically if the record is not found.
- `@Route` and `@Controller` decorators register routes in a global registry at module load time. The registry is read by `RouterBuilder.fromControllers()`.
- OpenAPI UI is only mounted when `DocServiceProvider` is registered. No UI is served by default.
