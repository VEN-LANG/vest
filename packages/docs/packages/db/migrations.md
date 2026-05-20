# Migrations

Migrations are version control for your database, allowing you to define and share your database schema.

## Creating Migrations

```bash
pnpm exec artisan make:migration create_users_table
```

This creates a file in `src/database/migrations/`:

```typescript
// 2024_01_01_000000_create_users_table.ts
import { Schema, TableBuilder } from '@lara-node/db'

export async function up(schema: Schema) {
  schema.create('users', (table: TableBuilder) => {
    table.increments('id').primary()
    table.string('name')
    table.string('email').unique()
    table.string('password')
    table.timestamp('email_verified_at').nullable()
    table.timestamps()
    table.softDeletes()
  })
}

export async function down(schema: Schema) {
  schema.drop('users')
}
```

## Running Migrations

```bash
# Run all pending migrations
pnpm exec artisan migrate

# Rollback last batch
pnpm exec artisan migrate:rollback

# Rollback all and re-run
pnpm exec artisan migrate:fresh

# Check migration status
pnpm exec artisan migrate:status
```

## Schema Builder

### Creating Tables

```typescript
schema.create('users', (table) => {
  table.increments('id').primary()
  table.string('name')
  table.timestamps()
})
```

### Column Types

```typescript
table.increments('id')        // Auto-incrementing integer
table.string('name')          // VARCHAR equivalent
table.text('bio')             // TEXT
table.integer('age')          // INTEGER
table.bigint('views')         // BIGINT
table.float('price')          // FLOAT
table.decimal('amount', 8, 2) // DECIMAL
table.boolean('active')       // BOOLEAN
table.date('birth_date')      // DATE
table.datetime('created_at')  // DATETIME
table.timestamp('updated_at') // TIMESTAMP
table.json('settings')        // JSON
table.uuid('uuid')            // UUID
table.enum('status', ['active', 'inactive'])
```

### Column Modifiers

```typescript
table.string('email').unique()
table.string('name').nullable()
table.integer('age').default(0)
table.string('token').index()
```

### Foreign Keys

```typescript
table.integer('user_id').unsigned()
table.foreign('user_id').references('id').on('users')

// Shorthand
table.foreignId('user_id').constrained('users')
```

### Modifying Tables

```typescript
schema.table('users', (table) => {
  table.string('phone').nullable()
  table.dropColumn('old_column')
  table.renameColumn('old_name', 'new_name')
})
```

### Dropping Tables

```typescript
schema.drop('users')
schema.dropIfExists('users')
```

### Helper Methods

```typescript
table.timestamps()        // created_at and updated_at
table.softDeletes()       // deleted_at
table.rememberToken()     // remember_token
```

## Programmatic Migration

```typescript
import { runMigrations, rollbackMigrations, migrateFresh } from '@lara-node/db'

await runMigrations()
await rollbackMigrations()
await migrateFresh()
```

## Next Steps

- [Seeders](/packages/db/seeders) -- Database seeders
- [Models](/packages/db/models) -- Working with models
- [Console Commands](/packages/console/built-in) -- Migration commands
