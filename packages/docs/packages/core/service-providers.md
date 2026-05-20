# Service Providers (Core)

Service providers are the central place for configuring your LaraNode application.

## Overview

Service providers handle:

- Registering services in the IoC container
- Booting services after registration
- Registering middleware
- Accessing configuration

## The ServiceProvider Class

```typescript
import { ServiceProvider } from '@lara-node/core'

export class AppServiceProvider extends ServiceProvider {
  register() {
    // Bind services
  }

  boot() {
    // Boot services
  }
}
```

## The `app` Property

Access the container via `this.app`:

```typescript
export class AppServiceProvider extends ServiceProvider {
  register() {
    this.app.singleton(UserService, () => {
      return new UserService(this.app.make(DatabaseService))
    })
  }

  boot() {
    const service = this.app.make(UserService)
    service.initialize()
  }
}
```

## Middleware Helpers

### `registerMiddleware()`

Register middleware aliases:

```typescript
export class HttpMiddlewareProvider extends MiddlewareServiceProvider {
  registerMiddleware() {
    return {
      aliases: {
        auth: AuthMiddleware,
        throttle: ThrottleMiddleware,
      },
      groups: {
        api: ['auth', 'throttle'],
      },
      priority: ['throttle'],
    }
  }
}
```

## Configuration Access

Access config in providers:

```typescript
boot() {
  const dbConfig = this.app.config('database')
  const cacheDriver = this.app.config('cache.driver')
}
```

## Lifecycle

```
1. app.register(Provider)
   └─ Provider.register()

2. app.boot()
   ├─ Provider.booting() callbacks
   ├─ Provider.boot()
   └─ Provider.booted() callbacks
```

## Next Steps

- [Application](/packages/core/application) -- Application class
- [Container](/packages/core/container) -- IoC container
- [Guide: Service Providers](/guide/service-providers) -- Full guide
