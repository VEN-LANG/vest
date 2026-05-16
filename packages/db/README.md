# @lara-node/db

Database layer for [Lara-Node](https://github.com/venomous-maker/vest) — Eloquent-style ORM with MySQL and MongoDB support, migrations, seeders, and model observers.

## Installation

```bash
pnpm add @lara-node/db
```

## Quick Start

```typescript
import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';

export class User extends Model {
  static table = 'users';
  static fillable = ['name', 'email', 'password'];
  static hidden = ['password'];
}
```

---

## Decorators

### `@Observe(ModelClass)`

Wires an Observer class to its target Model automatically when the module loads. No need to call `Model.observe(Observer)` in bootstrap code.

```typescript
import { Observer, Observe } from '@lara-node/db';
import { User } from '../Models/User';

@Observe(User)
export class UserObserver extends Observer<User> {
  creating(user: User): void {
    if (!user.getAttribute('status')) {
      user.setAttribute('status', 'active');
    }
  }

  created(user: User): void {
    console.log(`User created: ${user.getAttribute('email')}`);
  }

  updating(user: User): void {
    user.setAttribute('updated_at', new Date());
  }

  deleting(user: User): void {
    console.log(`User deleted: ${user.getAttribute('id')}`);
  }
}
```

**Without the decorator** (old way):
```typescript
// In bootstrap/app.ts — manual wiring
import { UserObserver } from './app/Observers/UserObserver';
import { User } from './app/Models/User';
User.observe(UserObserver);
```

**With the decorator** (new way): the `@Observe(User)` call in the observer file is sufficient — importing or auto-loading the file is all that's needed.

The Observer lifecycle hooks available are: `creating`, `created`, `updating`, `updated`, `saving`, `saved`, `deleting`, `deleted`, `restoring`, `restored`, `retrieved`.

---

## Model Querying

```typescript
// Find by primary key
const user = await User.find(1);

// Where clause
const active = await User.where('status', 'active').get();

// First match
const admin = await User.where('role', 'admin').first();

// Create
const user = await User.create({ name: 'Alice', email: 'alice@example.com' });

// Update
await user.save();

// Soft delete (requires SoftDeletes trait)
await user.delete();
await User.withTrashed().where('email', 'alice@example.com').first();
await user.restore();
```

---

## Model Traits

```typescript
import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps, Sluggable, Searchable, Cacheable } from '@lara-node/db';

@use(SoftDeletes, Timestamps)
export class Post extends Model { ... }
```

| Trait | Adds |
|-------|------|
| `SoftDeletes` | `delete()` sets `deleted_at`, `withTrashed()`, `restore()` |
| `Timestamps` | Auto-manages `created_at` / `updated_at` |
| `Sluggable` | Auto-generates `slug` from a source field |
| `Searchable` | `search(term)` full-text helper |
| `Cacheable` | Query result caching |

---

## Relationships

```typescript
export class User extends Model {
  roles() {
    return this.belongsToMany(Role, 'roles_users', 'user_id', 'role_id');
  }

  profile() {
    return this.hasOne(UserProfile, 'user_id', 'id');
  }
}

export class Post extends Model {
  author() {
    return this.belongsTo(User, 'user_id', 'id');
  }

  comments() {
    return this.hasMany(Comment, 'post_id', 'id');
  }
}
```

---

## Observers

An Observer class intercepts model lifecycle events. Register it with `@Observe(ModelClass)` (decorator) or `Model.observe(ObserverClass)` (manual).

```typescript
export abstract class Observer<T> {
  creating?(model: T): void | Promise<void>;
  created?(model: T): void | Promise<void>;
  updating?(model: T): void | Promise<void>;
  updated?(model: T): void | Promise<void>;
  saving?(model: T): void | Promise<void>;
  saved?(model: T): void | Promise<void>;
  deleting?(model: T): void | Promise<void>;
  deleted?(model: T): void | Promise<void>;
  restoring?(model: T): void | Promise<void>;
  restored?(model: T): void | Promise<void>;
  retrieved?(model: T): void | Promise<void>;
}
```

---

## Migrations

```typescript
import Schema, { TableBuilder } from '@lara-node/db';

export async function up() {
  await Schema.create('users', (table: TableBuilder) => {
    table.id();
    table.string('name');
    table.string('email').unique();
    table.string('password');
    table.timestamps();
    table.softDeletes();
  });
}

export async function down() {
  await Schema.dropIfExists('users');
}
```

---

## DB Facade

```typescript
import DB from '@lara-node/db';

// Raw query (MySQL only)
const rows = await DB.select('SELECT * FROM users WHERE id = ?', [1]);

// MongoDB collection
const col = await DB.collection('users');
await col.insertOne({ name: 'Alice' });
```

---

## License

MIT
