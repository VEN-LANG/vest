# Query Builder

The `EloquentBuilder` provides a fluent interface for constructing database queries.

## Basic Queries

```typescript
// Get all
const users = await User.query().get()

// Where clauses
const users = await User.where('active', true).get()
const users = await User.where('age', '>=', 18).get()

// Multiple where
const users = await User
  .where('active', true)
  .where('role', 'admin')
  .get()
```

## Where Clauses

```typescript
// Basic where
.where('column', 'value')
.where('column', '>', 10)

// Or where
.orWhere('status', 'pending')

// Where in
.whereIn('id', [1, 2, 3])

// Where null
.whereNull('deleted_at')

// Where not null
.whereNotNull('deleted_at')

// Where between
.whereBetween('age', [18, 65])

// Where has (relationships)
.whereHas('posts', (query) => {
  query.where('published', true)
})
```

## Joins

```typescript
.join('posts', 'users.id', '=', 'posts.user_id')
.leftJoin('profiles', 'users.id', '=', 'profiles.user_id')
```

## Ordering

```typescript
.orderBy('name')
.orderBy('created_at', 'desc')
.latest() // orderBy created_at desc
.oldest() // orderBy created_at asc
```

## Limiting Results

```typescript
.limit(10)
.offset(20)
```

## Selecting Columns

```typescript
.select('id', 'name', 'email')
.select(['id', 'name'])
.distinct()
```

## Aggregates

```typescript
.count()
.max('price')
.min('price')
.avg('price')
.sum('quantity')
```

## Pagination

```typescript
const result = await User.paginate(15, { page: 2 })
// { data: [...], total: 100, page: 2, perPage: 15, lastPage: 7 }
```

## Chunking

```typescript
await User.chunk(100, async (users) => {
  // Process 100 users at a time
})

await User.chunkById(100, async (users) => {
  // Process by ID
})
```

## Cursor

```typescript
const cursor = User.where('active', true).cursor()
for await (const user of cursor) {
  // Process one at a time
}
```

## Pluck and Value

```typescript
// Get single column values
const names = await User.pluck('name')

// Get single value
const email = await User.where('id', 1).value('email')
```

## First or Fail

```typescript
const user = await User.where('email', 'test@test.com').firstOrFail()
// Throws if not found

const user = await User.sole()
// Throws if not exactly one result
```

## Eager Loading

```typescript
// Load relationships
const users = await User.with('posts', 'profile').get()

// Constrained eager loading
const users = await User.with({
  posts: (query) => query.where('published', true),
}).get()
```

## Soft Deletes

```typescript
// Include soft deleted
.withTrashed().get()

// Only soft deleted
.onlyTrashed().get()

// Exclude soft deleted (default)
.withoutTrashed().get()
```

## Raw SQL

```typescript
.toSql() // Get the SQL string
```

## MongoDB Queries

```typescript
.toMongo() // Convert to MongoDB query format
```

## Next Steps

- [Relationships](/packages/db/relationships) -- Model relationships
- [Models](/packages/db/models) -- Working with models
- [DB Facade](/packages/db/facade) -- Raw queries
