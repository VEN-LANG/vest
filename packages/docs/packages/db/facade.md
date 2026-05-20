# DB Facade

The `DB` facade provides a fluent query builder for raw database operations without models.

## Basic Usage

```typescript
import { DB } from '@lara-node/db'

// Select
const users = await DB.select('SELECT * FROM users WHERE active = ?', [true])

// Table query
const users = await DB.table('users').where('active', true).get()
```

## Query Builder

```typescript
// Get all
const users = await DB.table('users').get()

// Where
const users = await DB.table('users').where('active', true).get()

// First
const user = await DB.table('users').where('id', 1).first()

// Insert
await DB.table('users').insert({
  name: 'John',
  email: 'john@example.com',
})

// Update
await DB.table('users').where('id', 1).update({
  name: 'Jane',
})

// Delete
await DB.table('users').where('id', 1).delete()
```

## Raw Queries

```typescript
// Select
const users = await DB.select('SELECT * FROM users')
const users = await DB.select('SELECT * FROM users WHERE id = ?', [1])

// Insert
await DB.insert('INSERT INTO users (name) VALUES (?)', ['John'])

// Update
await DB.update('UPDATE users SET name = ? WHERE id = ?', ['Jane', 1])

// Delete
await DB.delete('DELETE FROM users WHERE id = ?', [1])

// Statement
await DB.statement('TRUNCATE TABLE users')
```

## Collections

```typescript
const collection = DB.collection('users') // MongoDB

// MongoDB operations
await collection.insertOne({ name: 'John' })
await collection.findOne({ name: 'John' })
await collection.updateOne({ name: 'John' }, { $set: { age: 30 } })
await collection.deleteOne({ name: 'John' })
```

## Transactions

```typescript
// Using callback
await DB.transaction(async (db) => {
  await db.table('users').insert({ name: 'John' })
  await db.table('profiles').insert({ user_id: 1 })
})

// Manual
await DB.beginTransaction()
try {
  await DB.table('users').insert({ name: 'John' })
  await DB.commit()
} catch (error) {
  await DB.rollback()
  throw error
}
```

## Connection Management

```typescript
import { initDatabase, closeDatabase, getPool } from '@lara-node/db'

// Initialize
await initDatabase()

// Get connection pool
const pool = getPool()

// Close
await closeDatabase()
```

## Next Steps

- [Models](/packages/db/models) -- Working with models
- [Query Builder](/packages/db/query-builder) -- Eloquent query builder
- [Migrations](/packages/db/migrations) -- Database migrations
