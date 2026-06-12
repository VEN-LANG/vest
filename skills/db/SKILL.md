---
name: db
description: >-
  Database ORM inspired by Laravel Eloquent. Activates for questions about Model
  definitions, queries, relationships, migrations, seeders, traits (SoftDeletes,
  Timestamps, Sluggable, Sortable, Searchable, Cacheable), DB facade, or Schema builder.
---

# @lara-node/db

Eloquent-inspired ORM with MySQL and MongoDB support. Migrations, seeders, traits, observers, and relationships.

## Key Exports

| Export | Description |
|--------|-------------|
| `Model` | Abstract base model class |
| `EloquentBuilder<T>` | Fluent query builder |
| `DB` | Database facade for raw queries |
| `Schema` | Schema builder for migrations |
| `Observer`, `@Observe()` | Model observers |
| `@use()` | Decorator to apply traits |
| `SoftDeletes`, `Timestamps`, `Sluggable`, `Sortable`, `Searchable`, `Cacheable` | Built-in traits |

## Quick Start

```typescript
import { Model, use } from "@lara-node/db";
import { SoftDeletes, Timestamps } from "@lara-node/db";

@use(SoftDeletes, Timestamps)
class User extends Model {
  static table = "users";
  static fillable = ["name", "email", "password"];
  static hidden = ["password"];
  static casts = { email_verified_at: "date" };
}
```

## Querying

```typescript
const user = await User.find(1);
const users = await User.where("active", true).orderBy("name").paginate(15);
const created = await User.create({ name: "John", email: "john@example.com" });
await user.update({ name: "Jane" });
await user.delete();
```

## Relationships

Supports: `hasOne`, `hasMany`, `belongsTo`, `belongsToMany`, `morphOne`, `morphMany`, `morphToMany`, `belongsToThrough`.

```typescript
class Post extends Model {
  static table = "posts";

  author() {
    return this.belongsTo(User);
  }

  comments() {
    return this.hasMany(Comment);
  }

  tags() {
    return this.belongsToMany(Tag);
  }
}
```

## DB Facade

```typescript
import { DB } from "@lara-node/db";

const results = await DB.select("SELECT * FROM users WHERE active = ?", [true]);
await DB.insert("INSERT INTO users (name) VALUES (?)", ["John"]);
```

## Migrations

```typescript
import { Schema } from "@lara-node/db";

Schema.create("users", (table) => {
  table.id();
  table.string("name");
  table.string("email").unique();
  table.timestamps();
  table.softDeletes();
});
```
