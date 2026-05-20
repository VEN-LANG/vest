# Database Package

The `@lara-node/db` package provides a Laravel Eloquent-inspired ORM with support for MySQL and MongoDB, migrations, seeders, traits, and observers.

## Installation

```bash
pnpm add @lara-node/db mysql2 mongodb
```

## Overview

Features include:

- **Model-based ORM** with Eloquent-like syntax
- **MySQL and MongoDB** support
- **Relationships** -- hasOne, hasMany, belongsTo, belongsToMany, and more
- **Eager loading** with `with()`
- **Query builder** with fluent API
- **Migrations** and **seeders**
- **Traits** -- SoftDeletes, Timestamps, Sluggable, Sortable, Searchable, Cacheable
- **Observers** for model events
- **Accessors and Mutators**
- **DB facade** for raw queries

## Quick Start

### Define a Model

```typescript
import { Model, use } from '@lara-node/db'
import { SoftDeletes, Timestamps } from '@lara-node/db'

@use(SoftDeletes, Timestamps)
class User extends Model {
  static table = 'users'
  static fillable = ['name', 'email', 'password']
  static hidden = ['password']
  static casts = {
    email_verified_at: 'date',
  }
}
```

### Query Models

```typescript
// Find by ID
const user = await User.find(1)

// Query builder
const users = await User.where('active', true)
  .orderBy('name')
  .paginate(15)

// Create
const user = await User.create({
  name: 'John',
  email: 'john@example.com',
})

// Update
await user.update({ name: 'Jane' })

// Delete
await user.delete()
```

## Key Exports

| Export | Description |
|--------|-------------|
| `Model` | Abstract base model class |
| `EloquentBuilder<T>` | Fluent query builder |
| `DB` | Database facade for raw queries |
| `Schema` | Schema builder for migrations |
| `Observer` | Base class for model observers |
| `@Observe()` | Decorator to wire observers |
| `@use()` | Decorator to apply traits |
| `SoftDeletes` | Soft delete trait |
| `Timestamps` | Timestamps trait |
| `Sluggable` | Slug generation trait |
| `Sortable` | Sorting trait |
| `Searchable` | Search trait |
| `Cacheable` | Caching trait |

## Configuration

```typescript
// config/database.config.ts
export default {
  connection: process.env.DB_CONNECTION || 'mysql',
  mysql: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vest',
    poolLimit: parseInt(process.env.DB_POOL_LIMIT || '10'),
  },
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
    replicaSet: process.env.MONGO_REPLICA_SET,
  },
}
```

## Initialize Database

```typescript
import { initDatabase } from '@lara-node/db'

await initDatabase()
```

## Next Steps

- [Models](/packages/db/models) -- Working with models
- [Query Builder](/packages/db/query-builder) -- Fluent queries
- [Relationships](/packages/db/relationships) -- Model relationships
- [Migrations](/packages/db/migrations) -- Database migrations
