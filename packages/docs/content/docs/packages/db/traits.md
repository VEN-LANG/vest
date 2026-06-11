# Traits

Traits are reusable behaviors that can be applied to models.

## Available Traits

| Trait         | Description                       |
| ------------- | --------------------------------- |
| `SoftDeletes` | Soft delete support               |
| `Timestamps`  | Auto-manage created_at/updated_at |
| `Sluggable`   | Auto-generate URL slugs           |
| `Sortable`    | Sorting support                   |
| `Searchable`  | Full-text search                  |
| `Cacheable`   | Query caching                     |

## Applying Traits

Use the `@use()` decorator:

```typescript
import { Model, use } from "@lara-node/db";
import { SoftDeletes, Timestamps, Sluggable } from "@lara-node/db";

@use(SoftDeletes, Timestamps, Sluggable)
class Post extends Model {
  static table = "posts";
  static fillable = ["title", "content"];
  static slugSource = "title";
}
```

## SoftDeletes

Adds soft delete support:

```typescript
@use(SoftDeletes)
class User extends Model {
  static softDeletes = true;
}

// Usage
await user.delete(); // Soft deletes
await user.restore(); // Restores

// Queries
User.withTrashed().get(); // Include deleted
User.onlyTrashed().get(); // Only deleted
User.withoutTrashed().get(); // Exclude deleted
```

## Timestamps

Auto-manages timestamps:

```typescript
@use(Timestamps)
class User extends Model {
  static timestamps = true;
}

// Automatically sets created_at and updated_at
```

## Sluggable

Generates URL-friendly slugs:

```typescript
@use(Sluggable)
class Post extends Model {
  static slugSource = "title";
  static slugField = "slug";
}

// "Hello World" -> "hello-world"
```

## Sortable

Adds sorting support:

```typescript
@use(Sortable)
class Product extends Model {
  static sortable = ["name", "price", "created_at"];
}

// Usage
Product.orderBy("name", "asc").get();
```

## Searchable

Full-text search:

```typescript
@use(Searchable)
class Post extends Model {
  static searchable = ["title", "content"];
}

// Usage
const results = await Post.search("keyword").get();
```

## Cacheable

Caches query results:

```typescript
@use(Cacheable)
class User extends Model {
  static cacheTTL = 3600; // 1 hour
}

// Queries are automatically cached
```

## Next Steps

- [Models](/packages/db/models) -- Working with models
- [Observers](/packages/db/observers) -- Model observers
- [Relationships](/packages/db/relationships) -- Model relationships
