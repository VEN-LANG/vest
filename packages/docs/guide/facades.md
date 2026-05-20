# Facades

Facades provide a static-like interface to services registered in the container, enabling clean, expressive syntax.

## What are Facades?

Facades are proxy classes that redirect method calls to the underlying service instance in the container. They give you the convenience of static methods with the flexibility of dependency injection.

## Using Facades

### Cache Facade

```typescript
import { Cache } from "@lara-node/cache";

// Store a value
Cache.set("key", "value", 3600);

// Retrieve a value
const value = Cache.get("key");

// Get with default
const value = Cache.get("key", "default");

// Remember (get or set)
const users = Cache.remember("users", 3600, async () => {
  return User.all();
});
```

### DB Facade

```typescript
import { DB } from "@lara-node/db";

// Query builder
const users = DB.table("users").where("active", true).get();

// Raw query
const results = DB.select("SELECT * FROM users WHERE active = ?", [true]);

// Transaction
await DB.transaction(async (db) => {
  await db.table("users").insert({ name: "John" });
  await db.table("profiles").insert({ user_id: 1 });
});
```

### Broadcast Facade

```typescript
import { Broadcast } from "@lara-node/events";

Broadcast.channel("chat").emit("message", data);
```

### Mail Facade

```typescript
import { Mail } from "@lara-node/mail";

Mail.to("user@example.com").send(new WelcomeMail());
```

### RateLimiter Facade

```typescript
import { RateLimiter } from "@lara-node/cache";

if (RateLimiter.tooManyAttempts("key", 60)) {
  throw new RateLimitExceededException();
}

RateLimiter.hit("key", 60);
```

## How Facades Work

Facades work by:

1. Looking up the service in the container
2. Redirecting method calls to the resolved instance
3. Caching the resolved instance for subsequent calls

## Creating Custom Facades

You can create your own facades:

```typescript
import { Container } from "@lara-node/core";

export const MyService = {
  get method() {
    return container.make(MyServiceClass).method.bind(container.make(MyServiceClass));
  },
};
```

## Facade vs Direct Injection

| Facade                | Direct Injection                                    |
| --------------------- | --------------------------------------------------- |
| `Cache.get('key')`    | `const cache = app(CacheManager); cache.get('key')` |
| Cleaner syntax        | More explicit                                       |
| Good for quick access | Better for testing                                  |
|                       | Better for type inference                           |

## Next Steps

- [Container](/packages/core/container) -- Learn about the IoC container
- [Cache](/packages/cache) -- Cache facade usage
- [Database](/packages/db/facade) -- DB facade usage
