---
name: core
description: >-
  IoC container dependency injection, Application bootstrap, Service Provider system,
  and Configuration management. Activates for questions about container.make(),
  Injectable decorator, Application lifecycle, config helper, or creating service providers.
---

# @lara-node/core

Foundation of LaraNode: IoC container, Application bootstrap, Service Providers, Middleware Stack, and Configuration.

## Key Exports

| Export | Description |
|--------|-------------|
| `Container`, `container` | IoC container class + singleton instance |
| `app` | Application singleton |
| `Injectable()` | DI decorator for auto-resolution |
| `Application` | Express wrapper with lifecycle management |
| `ServiceProvider` | Base class for service providers |
| `MiddlewareServiceProvider` | Base for middleware providers |
| `MiddlewareStack`, `middlewareStack` | Middleware manager |
| `FormRequest` | Validated request base class |
| `Provider()` | Auto-discovery decorator |
| `config()`, `setConfig()`, `hasConfig()`, `allConfig()` | Configuration helpers |
| `dd()`, `clone()` | Debugging and utility helpers |

## Quick Start

```typescript
import { Application, Container } from "@lara-node/core";
import "reflect-metadata";

const container = new Container();
const app = new Application(container);

app.register(AppServiceProvider);

await app.boot();
await app.listen(3000);
```

## Container (IoC)

```typescript
import { container, Injectable } from "@lara-node/core";

// Register a binding
container.bind("myService", () => new MyService());
container.singleton("db", () => new Database());

// Resolve
const service = container.make<MyService>("myService");

// Decorator-based injection
@Injectable()
class UserService {
  constructor(private db: DatabaseService) {}
}
const userService = container.make(UserService);
```

## Service Providers

```typescript
import { ServiceProvider } from "@lara-node/core";

export class AppServiceProvider extends ServiceProvider {
  register() {
    this.app.bind("myService", () => new MyService());
  }

  boot() {
    const service = this.app.make("myService");
    service.initialize();
  }
}
```

## Middleware Stack

```typescript
import { MiddlewareStack, middlewareStack } from "@lara-node/core";

middlewareStack.add("auth", AuthMiddleware);
middlewareStack.group("api", ["auth", "throttle"]);
middlewareStack.priority("errorHandler");
```

## Configuration

```typescript
import { config, setConfig } from "@lara-node/core";

const value = config("database.connections.mysql.host");
setConfig("app.name", "MyApp");
```
