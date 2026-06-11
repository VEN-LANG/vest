# IoC Container

The Container is LaraNode's dependency injection container. It manages class dependencies and performs automatic resolution.

## Basic Usage

```typescript
import { Container, container } from "@lara-node/core";

// Use the singleton
container.bind("service", () => new MyService());
const service = container.make("service");

// Or create your own
const myContainer = new Container();
```

## Binding Methods

### `bind()`

Register a transient binding (new instance each time):

```typescript
container.bind(Logger, () => new Logger());
container.bind("mailer", () => new MailManager());
```

### `singleton()`

Register a singleton (same instance always):

```typescript
container.singleton(DatabaseService, () => {
  return new DatabaseService(config("database"));
});
```

### `instance()`

Bind an existing instance:

```typescript
const expressApp = express();
container.instance("express", expressApp);
```

### `alias()`

Create an alias for an existing binding:

```typescript
container.bind("cache", () => new CacheManager());
container.alias("cache", CacheManager);
```

## Resolving

### `make()`

Resolve a service from the container:

```typescript
const service = container.make(UserService);
const mailer = container.make("mailer");
```

### `app()` Helper

Convenient helper for resolving:

```typescript
import { app } from "@lara-node/core";

// Resolve a service
const service = app(UserService);

// Get the container
const container = app();
```

## Automatic Resolution

The container can automatically resolve dependencies:

```typescript
import { Injectable } from "@lara-node/core";

@Injectable()
class UserService {
  constructor(
    private db: DatabaseService,
    private cache: CacheManager,
  ) {}
}

// Container resolves DatabaseService and CacheManager automatically
const service = container.make(UserService);
```

## Resolving Callbacks

Register callbacks that fire when a type is resolved:

```typescript
container.resolving(UserService, (service) => {
  service.initialize();
});

container.resolving("*", (resolved) => {
  console.log("Resolved:", resolved.constructor.name);
});
```

## Checking Bindings

```typescript
// Check if bound
container.bound("service"); // boolean

// Check if singleton
container.isSingleton(Logger); // boolean
```

## Practical Example

```typescript
// Register services
container.singleton(DatabaseService, () => {
  return new DatabaseService(config("database"));
});

container.singleton(CacheManager, () => {
  return new CacheManager(config("cache"));
});

container.bind(UserService, () => {
  return new UserService(container.make(DatabaseService), container.make(CacheManager));
});

// Resolve
const users = container.make(UserService);
const allUsers = await users.all();
```

## Next Steps

- [Application](/packages/core/application) -- Application bootstrap
- [Service Providers](/packages/core/service-providers) -- Creating providers
- [Dependency Injection](/guide/dependency-injection) -- DI guide
