# Introduction

LaraNode is a **Laravel-inspired Node.js framework** built on top of Express.js. It brings the elegant developer experience of Laravel to the Node.js ecosystem, with a focus on developer productivity, clean architecture, and convention over configuration.

## Why LaraNode?

If you love Laravel's expressive syntax and architecture but need to work in the Node.js ecosystem, LaraNode is for you. It provides:

- **Familiar patterns** -- Service providers, facades, Eloquent ORM, Artisan CLI
- **TypeScript first** -- Full TypeScript support with decorators and type inference
- **Modular architecture** -- 16 focused packages you can use independently
- **Production ready** -- Queue workers, caching, rate limiting, monitoring dashboards

## Philosophy

LaraNode follows Laravel's core principles:

1. **Developer Experience** -- Expressive, readable APIs that make sense
2. **Convention over Configuration** -- Sensible defaults with flexibility to override
3. **Batteries Included** -- Everything you need out of the box
4. **Elegant Architecture** -- IoC container, service providers, facades

## Core Concepts

### Service Providers

Service providers are the central place for configuring your application. They register bindings in the IoC container and boot services:

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

### IoC Container

The container manages class dependencies and performs dependency injection:

```typescript
import { container, Injectable } from "@lara-node/core";

@Injectable()
class UserService {
  constructor(private db: DatabaseService) {}
}

const service = container.make(UserService);
```

### Eloquent Models

Models provide an expressive way to interact with your database:

```typescript
import { Model, use } from "@lara-node/db";
import { SoftDeletes, Timestamps } from "@lara-node/db";

@use(SoftDeletes, Timestamps)
class User extends Model {
  static table = "users";
  static fillable = ["name", "email", "password"];
  static hidden = ["password"];
}

const users = await User.where("active", true).get();
```

### Routing

Define routes with a fluent builder or controller decorators:

```typescript
import { Route } from "@lara-node/router";

@Route("/api/users")
class UserController {
  @Route.get("/")
  async index() {
    return User.all();
  }

  @Route.post("/")
  async store(req: Request) {
    return User.create(req.body);
  }
}
```

## Package Ecosystem

LaraNode is organized into focused packages:

| Package                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| `@lara-node/core`        | IoC container, Application, Service Providers |
| `@lara-node/db`          | Eloquent ORM with MySQL & MongoDB             |
| `@lara-node/router`      | Expressive routing with decorators            |
| `@lara-node/auth`        | JWT authentication & password hashing         |
| `@lara-node/validator`   | 50+ validation rules                          |
| `@lara-node/cache`       | Multi-driver caching & rate limiting          |
| `@lara-node/queue`       | Job queues with workers                       |
| `@lara-node/events`      | Event dispatcher & broadcasting               |
| `@lara-node/mail`        | Multi-driver email system                     |
| `@lara-node/middlewares` | Pre-built middleware                          |
| `@lara-node/carbon`      | Laravel Carbon-inspired dates                 |
| `@lara-node/console`     | Artisan-style CLI                             |
| `@lara-node/horizon`     | Queue monitoring dashboard                    |
| `@lara-node/telescope`   | Debug dashboard                               |

## Next Steps

- [Getting Started](/guide/getting-started) -- Create your first LaraNode application
- [Installation](/guide/installation) -- Install LaraNode in your project
- [Project Structure](/guide/project-structure) -- Understand the directory layout
