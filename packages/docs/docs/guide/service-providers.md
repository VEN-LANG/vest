# Service Providers

Service providers are the central place to configure and bootstrap your LaraNode application. They are the bridge between your application code and the IoC container.

## Overview

Every LaraNode application has service providers that register services in the container. When you run `create-vest`, you get `AppServiceProvider` and `RouteServiceProvider` by default.

## Creating a Provider

Extend the `ServiceProvider` abstract class:

```typescript
import { ServiceProvider } from '@lara-node/core'

export class AppServiceProvider extends ServiceProvider {
  register() {
    // Register bindings in the container
  }

  boot() {
    // Boot services after all providers are registered
  }
}
```

## Lifecycle Methods

### `register()`

Called first. Use this to bind services into the container:

```typescript
register() {
  // Bind a singleton
  this.app.singleton(DatabaseService, () => {
    return new DatabaseService(config('database'))
  })

  // Bind a transient service
  this.app.bind(Logger, () => new Logger())

  // Bind with a string alias
  this.app.bind('mailer', () => new MailManager())
}
```

### `boot()`

Called after all providers have been registered. Use this to access other services:

```typescript
boot() {
  // All services are now available
  const db = this.app.make(DatabaseService)
  const router = this.app.make(RouterBuilder)

  // Configure routes
  this.registerRoutes(router)
}
```

### Lifecycle Hooks

You can hook into the boot process:

```typescript
booting(callback: () => void) {
  // Called before boot
}

booted(callback: () => void) {
  // Called after boot
}
```

## Registering Providers

Register providers in your application bootstrap:

```typescript
// src/bootstrap/app.ts
import { Application, Container } from '@lara-node/core'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider'
import { RouteServiceProvider } from '../app/Providers/RouteServiceProvider'
import { CacheServiceProvider } from '@lara-node/cache'
import { QueueServiceProvider } from '@lara-node/queue'

const container = new Container()
const app = new Application(container)

app.register(AppServiceProvider)
app.register(RouteServiceProvider)
app.register(CacheServiceProvider)
app.register(QueueServiceProvider)

export { app }
```

## Provider with Middleware

Providers can register middleware aliases:

```typescript
import { MiddlewareServiceProvider } from '@lara-node/core'

export class HttpMiddlewareProvider extends MiddlewareServiceProvider {
  registerMiddleware() {
    return {
      aliases: {
        auth: AuthMiddleware,
        throttle: ThrottleMiddleware,
        admin: AdminMiddleware,
      },
      groups: {
        api: ['throttle', 'auth'],
        web: ['session'],
      },
      priority: ['auth', 'throttle'],
    }
  }
}
```

## Auto-Discovery with @Provider

Use the `@Provider()` decorator for auto-discovery:

```typescript
import { Provider } from '@lara-node/core'

@Provider()
export class EventServiceProvider extends ServiceProvider {
  register() {
    // Auto-discovered
  }
}
```

## Middleware Service Provider

For registering middleware, extend `MiddlewareServiceProvider`:

```typescript
import { MiddlewareServiceProvider } from '@lara-node/core'

export class MyMiddlewareProvider extends MiddlewareServiceProvider {
  registerMiddleware() {
    return {
      // Middleware aliases (used in routes)
      aliases: {
        'auth': AuthMiddleware,
        'cors': CorsMiddleware,
      },
      // Middleware groups
      groups: {
        'api': ['cors', 'auth'],
        'web': ['session', 'csrf'],
      },
      // Priority middleware (runs first)
      priority: ['cors'],
    }
  }
}
```

## Conditional Registration

Register services based on environment:

```typescript
register() {
  if (config('app.env') === 'production') {
    this.app.singleton(CacheDriver, () => new RedisCache())
  } else {
    this.app.singleton(CacheDriver, () => new FileCache())
  }
}
```

## Next Steps

- [Dependency Injection](/guide/dependency-injection) -- Learn about DI
- [Configuration](/guide/configuration) -- Configure your application
- [Core Package](/packages/core) -- Deep dive into the core
