# Dependency Injection

LaraNode uses a powerful IoC (Inversion of Control) container for dependency injection, inspired by Laravel's container.

## The Container

The container is the heart of LaraNode's dependency injection system:

```typescript
import { container, Container } from "@lara-node/core";

// Get the singleton instance
const container = container;

// Or create your own
const myContainer = new Container();
```

## Binding Services

### Simple Binding

```typescript
container.bind("logger", () => new Logger());
const logger = container.make("logger");
```

### Singleton Binding

Singletons are resolved once and cached:

```typescript
container.singleton(DatabaseService, () => {
  return new DatabaseService(config("database"));
});

// Same instance returned each time
const db1 = container.make(DatabaseService);
const db2 = container.make(DatabaseService);
// db1 === db2
```

### Instance Binding

Bind an existing instance:

```typescript
const expressApp = express();
container.instance("express", expressApp);
```

### Alias Binding

Create aliases for existing bindings:

```typescript
container.bind("cache", () => new CacheManager());
container.alias("cache", CacheManager);

// Both resolve to the same service
container.make("cache");
container.make(CacheManager);
```

## Resolving Services

### Using `make()`

```typescript
const service = container.make(UserService);
```

### Using `app()` Helper

```typescript
import { app } from "@lara-node/core";

// Resolve a service
const service = app(UserService);

// Get the container
const container = app();
```

## Automatic Resolution

The container can automatically resolve class dependencies:

```typescript
import { Injectable } from "@lara-node/core";

@Injectable()
class EmailService {
  constructor(private mailer: MailManager) {}

  sendWelcomeEmail(user: User) {
    this.mailer.to(user.email).send();
  }
}

// Container automatically resolves MailManager
const emailService = container.make(EmailService);
```

## Injectable Decorator

Mark classes for automatic dependency injection:

```typescript
import { Injectable } from "@lara-node/core";

@Injectable()
class UserService {
  constructor(
    private db: DatabaseService,
    private cache: CacheManager,
    private events: EventDispatcher,
  ) {}
}
```

## Resolving Callbacks

Run callbacks when a type is resolved:

```typescript
container.resolving(UserService, (service) => {
  service.initialize();
});
```

## Binding Contextual Values

Bind different implementations based on context:

```typescript
container
  .when(DatabaseService)
  .needs(CacheDriver)
  .give(() => new RedisCache());
```

## Practical Example

```typescript
// src/app/Providers/AppServiceProvider.ts
import { ServiceProvider } from "@lara-node/core";
import { UserService } from "../Services/UserService";
import { AuthService } from "../Services/AuthService";

export class AppServiceProvider extends ServiceProvider {
  register() {
    // Bind services
    this.app.singleton(UserService, () => {
      return new UserService(this.app.make(DatabaseService), this.app.make(CacheManager));
    });

    this.app.singleton(AuthService, () => {
      return new AuthService(this.app.make(UserService), this.app.make(JwtService));
    });
  }
}

// Usage in controller
import { Injectable } from "@lara-node/core";

@Injectable()
class UserController {
  constructor(private userService: UserService) {}

  async index() {
    return this.userService.all();
  }
}
```

## Next Steps

- [Service Providers](/guide/service-providers) -- Learn about service providers
- [Core Container](/packages/core/container) -- Deep dive into the container
- [Application](/packages/core/application) -- Learn about the Application class
