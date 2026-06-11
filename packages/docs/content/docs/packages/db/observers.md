# Observers

Observers allow you to listen to model lifecycle events.

## Creating Observers

Extend the `Observer` class:

```typescript
import { Observer } from "@lara-node/db";
import { User } from "../Models/User";

@Observe(User)
class UserObserver extends Observer {
  async creating(user: User) {
    // Before creating
  }

  async created(user: User) {
    // After creating
    console.log(`User created: ${user.email}`);
  }

  async updating(user: User) {
    // Before updating
  }

  async updated(user: User) {
    // After updating
  }

  async deleting(user: User) {
    // Before deleting
  }

  async deleted(user: User) {
    // After deleting
  }

  async restoring(user: User) {
    // Before restoring (soft delete)
  }

  async restored(user: User) {
    // After restoring
  }

  async retrieved(user: User) {
    // After retrieving from database
  }
}
```

## Available Events

| Event       | When                                         |
| ----------- | -------------------------------------------- |
| `creating`  | Before a new model is saved                  |
| `created`   | After a new model is saved                   |
| `updating`  | Before an existing model is updated          |
| `updated`   | After an existing model is updated           |
| `saving`    | Before a model is saved (create or update)   |
| `saved`     | After a model is saved                       |
| `deleting`  | Before a model is deleted                    |
| `deleted`   | After a model is deleted                     |
| `restoring` | Before a soft-deleted model is restored      |
| `restored`  | After a soft-deleted model is restored       |
| `retrieved` | After a model is retrieved from the database |

## Registering Observers

### Using @Observe Decorator

```typescript
import { Observe } from "@lara-node/db";

@Observe(User)
class UserObserver extends Observer {
  created(user: User) {
    // ...
  }
}
```

### Manual Registration

```typescript
User.observe(UserObserver);
```

## Example: Hash Password

```typescript
@Observe(User)
class UserObserver extends Observer {
  async creating(user: User) {
    if (user.password) {
      user.password = await hashPassword(user.password);
    }
  }

  async updating(user: User) {
    if (user.isDirty("password")) {
      user.password = await hashPassword(user.password);
    }
  }
}
```

## Example: Send Welcome Email

```typescript
@Observe(User)
class UserObserver extends Observer {
  async created(user: User) {
    await Mail.to(user.email).send(new WelcomeMailable(user));
  }
}
```

## Example: Clear Cache

```typescript
@Observe(User)
class UserObserver extends Observer {
  async updated(user: User) {
    await Cache.del(`user:${user.id}`);
  }

  async deleted(user: User) {
    await Cache.del(`user:${user.id}`);
  }
}
```

## Next Steps

- [Models](/packages/db/models) -- Working with models
- [Traits](/packages/db/traits) -- Model traits
- [Events](/packages/events) -- Event system
