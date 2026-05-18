# @lara-node/core

IoC container, application bootstrap, service providers, middleware stack, and config system for [Lara-Node](https://github.com/venomous-maker/vest).

## Installation

```sh
pnpm add @lara-node/core
```

## Quick Start

```ts
import 'reflect-metadata';
import { Application, container } from '@lara-node/core';
import { AppServiceProvider } from './app/Providers/AppServiceProvider';
import { RouteServiceProvider } from './app/Providers/RouteServiceProvider';

const app = new Application(container);

app.register(AppServiceProvider);
app.register(RouteServiceProvider);

await app.boot();
app.listen(3000, () => console.log('Listening on :3000'));
```

## API

### `Application`

The main application class. Wraps an Express instance, a service provider registry, and the IoC container.

```ts
import { Application, container } from '@lara-node/core';

const app = new Application(container);

// Register service providers
app.register(AppServiceProvider);

// Auto-register all @Provider()-decorated classes loaded in module scope
app.discoverProviders();

// Boot all providers (calls each provider's boot() method)
await app.boot();

// Get the underlying Express app
const express = app.getExpressApp();

// Get the underlying http.Server (available after listen())
const server = app.getHttpServer();

// Start listening
app.listen(3000);
app.listen(3000, () => console.log('Ready'));
```

### `Container`

Lightweight IoC container with constructor injection via `reflect-metadata`.

```ts
import { container } from '@lara-node/core';

// Bind a factory (new instance each time)
container.bind('mailer', () => new MailService());

// Bind a singleton
container.singleton('db', () => new DatabaseService());

// Resolve
const db = container.make<DatabaseService>('db');

// Register a class directly (uses constructor injection)
container.singleton(AuthService);

// Bind an interface to an implementation
container.singleton(IUserRepository, UserRepository);

// Create an alias
container.alias('cache', 'CacheManager');
```

### `ServiceProvider`

Base class for all service providers. Override `register()` to bind things into the container and `boot()` to run logic after all providers are registered.

```ts
import { ServiceProvider } from '@lara-node/core';
import { AuthService } from '../Services/AuthService';
import { UserRepository } from '../Repositories/UserRepository';

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton(UserRepository);
    this.singleton(AuthService);

    // Bind with factory
    this.app.container.bind('stripe', () => new StripeClient(process.env.STRIPE_KEY!));
  }

  async boot(): Promise<void> {
    // Runs after all providers are registered
    // Safe to resolve dependencies here
    const auth = this.app.container.make(AuthService);
    auth.initialize();
  }
}
```

### `config` and `setConfig`

Dot-notation config accessor. Namespaces are registered by service providers or at bootstrap.

```ts
import { config, setConfig } from '@lara-node/core';

// Register a config namespace (done in a ServiceProvider)
setConfig('app', {
  name: process.env.APP_NAME ?? 'Lara-Node',
  env: process.env.NODE_ENV ?? 'production',
  debug: process.env.APP_DEBUG === 'true',
});

// Read with dot notation
const appName = config('app.name');
const debug   = config<boolean>('app.debug', false);
const driver  = config('db.default', 'mysql');
```

### `@Injectable()`

Marks a class for automatic constructor injection. Requires `emitDecoratorMetadata: true` in `tsconfig.json` and `import 'reflect-metadata'` before first use.

```ts
import { Injectable } from '@lara-node/core';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly cache: CacheService,
  ) {}

  async login(email: string, password: string) {
    // ...
  }
}
```

### `@Inject(token)`

Manually specify the resolution token for a constructor parameter when the type alone is not sufficient.

```ts
import { Injectable, Inject } from '@lara-node/core';

@Injectable()
export class MailService {
  constructor(
    @Inject('smtp-config') private readonly config: SmtpConfig,
  ) {}
}
```

### `@Provider(name?)`

Marks a `ServiceProvider` subclass for auto-discovery via `app.discoverProviders()`. Registration order follows module import order.

```ts
import { ServiceProvider, Provider } from '@lara-node/core';

@Provider()
export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.singleton(UserRepository);
  }
}
```

In your bootstrap file, import providers in the desired registration order before calling `discoverProviders()`:

```ts
import './app/Providers/AppServiceProvider';
import './app/Providers/MiddlewareServiceProvider';
import './app/Providers/RouteServiceProvider';

app.discoverProviders();
```

### Middleware registration

```ts
import { registerMiddleware, resolveMiddleware } from '@lara-node/core';

// Register a named alias
registerMiddleware('auth', JwtMiddleware);
registerMiddleware('throttle', ThrottleMiddleware);

// Resolve (used internally by the router)
const handler = resolveMiddleware('auth');
```

## Config File Pattern

A typical `config/app.ts`:

```ts
import { setConfig } from '@lara-node/core';

setConfig('app', {
  name: process.env.APP_NAME ?? 'My API',
  env: process.env.NODE_ENV ?? 'production',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  key: process.env.APP_KEY,
  timezone: 'UTC',
});
```

Load it before calling `app.boot()`:

```ts
import './config/app';
import './config/db';
import './config/mail';
```

## Notes

- `reflect-metadata` must be imported once, as early as possible in your entry file, before any decorator-annotated class is loaded.
- `container.singleton` called with a class uses TypeScript's emitted type metadata to resolve constructor parameters automatically — no manual factory needed.
- `discoverProviders()` is optional. You can always call `app.register()` manually for full control over registration order.
