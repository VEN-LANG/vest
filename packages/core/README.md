# @lara-node/core

IoC container, application bootstrap, service providers, middleware stack, and config system for [Lara-Node](https://github.com/venomous-maker/vest).

## Installation

```bash
pnpm add @lara-node/core
```

---

## Decorators

### `@Injectable()`

Marks a class for automatic dependency resolution by the IoC container. The container reads constructor parameter types (via `reflect-metadata`) and instantiates dependencies automatically.

```typescript
import { Injectable } from '@lara-node/core';

@Injectable()
export class AuthService {
  constructor(private readonly userRepo: UserRepository) {}

  async login(email: string, password: string) { ... }
}
```

Requires `emitDecoratorMetadata: true` in `tsconfig.json` and `import 'reflect-metadata'` before first use.

---

### `@Provider()`

Marks a ServiceProvider class for auto-discovery. After decorating your providers, call `app.discoverProviders()` in bootstrap to register all decorated providers in module load order.

```typescript
import { ServiceProvider, Provider } from '@lara-node/core';

@Provider()
export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton(UserRepository);
    this.singleton(AuthService);
  }
}

@Provider()
export class RouteServiceProvider extends ServiceProvider {
  register(): void { ... }
  boot(): void { ... }
}
```

**In bootstrap/app.ts:**
```typescript
// Import in the order you want providers to register
import './app/Providers/AppServiceProvider';
import './app/Providers/MiddlewareServiceProvider';
import './app/Providers/RouteServiceProvider';

// Register all @Provider()-decorated classes
app.discoverProviders();

// Or continue using manual registration for full control:
app.register(AppServiceProvider);
app.register(MiddlewareServiceProvider);
app.register(RouteServiceProvider);
```

> **Note:** Registration order matters (a provider that depends on another's bindings must be registered after). Since `import` order controls load order, `discoverProviders()` respects the sequence your modules are imported.

---

## Service Providers

```typescript
import { ServiceProvider } from '@lara-node/core';

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    // Bind singletons
    this.singleton(UserRepository);
    this.singleton(AuthService);
  }

  async boot(): Promise<void> {
    // Runs after all providers are registered
  }
}
```

---

## Container

```typescript
import { container, Injectable } from '@lara-node/core';

// Manual registration
container.singleton(AuthService);

// Resolve
const svc = container.make(AuthService);

// Bind interface to implementation
container.singleton(IUserRepository, UserRepository);
```

---

## Application

```typescript
import { Application, container } from '@lara-node/core';

const app = new Application(container);

// Register providers
app.register(AppServiceProvider);

// Discover all @Provider()-decorated classes
app.discoverProviders();

// Boot all providers
await app.boot();

// Start HTTP server
app.listen(3000, () => console.log('Listening on port 3000'));
```

---

## Config

```typescript
import { config, setConfig } from '@lara-node/core';

// Read (supports dot notation)
const driver = config('db.default', 'mysql');
const name   = config('app.name');

// Write (usually done in a ServiceProvider)
setConfig('app', { name: 'My API', env: 'production' });
```

---

## Middleware Stack

```typescript
import { registerMiddleware, resolveMiddleware } from '@lara-node/core';

// Register a named alias
registerMiddleware('auth', authMiddleware);
registerMiddleware('can', (...perms) => authorizePermissions(...perms));

// Resolve — returns the middleware handler
const handler = resolveMiddleware('auth');
```

---

## License

MIT
