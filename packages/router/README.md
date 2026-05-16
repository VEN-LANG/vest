# @lara-node/router

Express router builder, middleware stack, OpenAPI generator, and route-model binding for [Lara-Node](https://github.com/venomous-maker/vest).

## Installation

```bash
pnpm add @lara-node/router
```

---

## Decorators

### `@Bind(name?)`

Registers a Model subclass for route-model binding. When a route has a parameter matching the bound name (e.g. `:user`), the router automatically loads the model from the database and injects the instance into `req.params`.

```typescript
import { Model, use } from '@lara-node/db';
import { Bind } from '@lara-node/router';

@Bind()           // registers as 'user' (class name lowercased)
export class User extends Model { ... }

@Bind('role')     // explicit name — binds :role params
export class Role extends Model { ... }
```

The registration happens when the module is first loaded. Use `autoRegisterModels()` in `RouteServiceProvider` to load all model files at startup — the decorators fire automatically.

**In routes:**
```typescript
// :user is automatically resolved to a loaded User instance
g.get('/:user', 'auth', [UserController, 'show']);

// Controller receives the loaded model directly
async show(req: Request, res: Response) {
  const user = req.params.user as unknown as User;
  res.json({ data: user.getForArray() });
}
```

---

### `@Middleware(alias)`

Registers an IMiddleware class under a named alias. Eliminates the need to call `registerMiddleware(alias, cls)` in a service provider — the registration is self-contained in the middleware file.

```typescript
import { Injectable } from '@lara-node/core';
import { Middleware } from '@lara-node/router';
import type { IMiddleware } from '@lara-node/router';
import type { Request, Response, NextFunction } from 'express';

@Middleware('auth')
@Injectable()
export class AuthMiddleware implements IMiddleware {
  handle(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Unauthenticated' }) as any;
    // validate token...
    next();
  }
}
```

**Without the decorator** (old way):
```typescript
// In MiddlewareServiceProvider.ts
this.middlewareAlias('auth', AuthMiddleware);
```

**With the decorator** (new way): importing or auto-loading the file registers `auth` automatically.

For parametric middleware (e.g. `'can:view_users'`), register a factory function as before via `middlewareAlias()`.

---

### `@Route(prefix, ...classMiddleware)` + `@Route.get / .post / .put / .patch / .delete`

Controller-centric routing decorators. Apply `@Route(prefix)` to the class to set its base path, then use `@Route.get(path, ...middleware)` (and other verbs) on individual methods. Routes are registered in the global controller registry when the module loads.

```typescript
import { Route } from '@lara-node/router';
import type { Request, Response } from 'express';

@Route('/api/users', 'auth')        // base prefix + class-level middleware
export class UserController {

  @Route.get('/')                   // GET  /api/users/
  async index(req: Request, res: Response) {
    const users = await User.all();
    res.json({ data: users });
  }

  @Route.post('/', 'can:create_users')   // POST /api/users/ + extra middleware
  async store(req: Request, res: Response) {
    const user = await User.create(req.body);
    res.status(201).json({ data: user });
  }

  @Route.get('/:user')              // GET  /api/users/:user — :user auto-bound to User model
  async show(req: Request, res: Response) {
    const user = req.params.user as unknown as User;
    res.json({ data: user.getForArray() });
  }

  @Route.put('/:user', 'can:update_users')
  async update(req: Request, res: Response) {
    const user = req.params.user as unknown as User;
    await user.fill(req.body).save();
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

**Mounting all registered controllers at once:**
```typescript
// In RouteServiceProvider.boot():
const router = RouterBuilder.fromControllers();
this.app.mountRoutes('/', router.build());
```

**Mounting specific controllers:**
```typescript
const router = new RouterBuilder();
router.addController(UserController);
router.addController(AuthController);
this.app.mountRoutes('/api', router.build());
```

The route files (`src/routes/api.ts`) and `@Route` controllers are complementary — you can use either or both.

---

## Route Builder

```typescript
import RouterBuilder from '@lara-node/router';

const router = new RouterBuilder();

router.group({ prefix: '/users', middleware: ['auth'] }, (g) => {
  g.get('/',      [UserController, 'index']);
  g.post('/',     [UserController, 'store']);
  g.get('/:user', [UserController, 'show']);   // :user → loaded User model
  g.put('/:user', [UserController, 'update']);
  g.delete('/:user', [UserController, 'destroy']);
});

export const routesBuilder = router;
```

---

## Middleware Stack

```typescript
import { middlewareStack } from '@lara-node/router';

// Register a named alias
middlewareStack.alias('auth', authMiddleware);

// Define a group
middlewareStack.group('api', ['throttle:120,1', 'auth']);

// Set priority order
middlewareStack.setPriority(['auth', 'can', 'role']);
```

---

## `autoRegisterModels(dir)`

Walks a directory tree, `require()`s every `.ts`/`.js` file (triggering `@Bind()` decorators), and also falls back to prototype-chain inspection for models without the decorator.

```typescript
// In RouteServiceProvider.register():
import { autoRegisterModels } from '@lara-node/router';
import path from 'path';

protected async registerModels(): Promise<void> {
  await autoRegisterModels(path.resolve(__dirname, '../Models'));
}
```

---

## `modelRegistryMiddleware(dir)`

Express middleware variant of `autoRegisterModels` — runs the scan on the first incoming request (lazy) rather than at startup.

```typescript
app.use(modelRegistryMiddleware(path.join(__dirname, '../Models')));
```

---

## OpenAPI / Doc Generation

```typescript
import { Doc } from '@lara-node/router';

router.get('/users', [UserController, 'index'],
  Doc.get('List users')
     .tag('Users')
     .response(200, 'User list')
     .auth()
);

// Generate spec
const generator = new OpenApiGenerator(router);
const spec = generator.generate({ title: 'My API', version: '1.0.0' });
```

---

## License

MIT
