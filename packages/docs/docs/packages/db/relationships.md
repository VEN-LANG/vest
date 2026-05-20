# Relationships

LaraNode models support Laravel-style relationships for connecting related data.

## Defining Relationships

Define relationships in the static `relationships` property:

```typescript
class User extends Model {
  static table = 'users'

  static relationships = {
    posts: {
      type: 'hasMany',
      model: () => Post,
      foreignKey: 'user_id',
    },
    profile: {
      type: 'hasOne',
      model: () => Profile,
      foreignKey: 'user_id',
    },
    role: {
      type: 'belongsTo',
      model: () => Role,
      foreignKey: 'role_id',
    },
  }
}
```

## Has One

One-to-one relationship:

```typescript
class User extends Model {
  static relationships = {
    profile: {
      type: 'hasOne',
      model: () => Profile,
      foreignKey: 'user_id',
    },
  }
}

// Access
const user = await User.find(1)
const profile = await user.profile
```

## Has Many

One-to-many relationship:

```typescript
class User extends Model {
  static relationships = {
    posts: {
      type: 'hasMany',
      model: () => Post,
      foreignKey: 'user_id',
    },
  }
}

// Access
const posts = await user.posts
```

## Belongs To

Inverse of hasOne/hasMany:

```typescript
class Post extends Model {
  static relationships = {
    author: {
      type: 'belongsTo',
      model: () => User,
      foreignKey: 'user_id',
    },
  }
}

// Access
const author = await post.author
```

## Belongs To Many

Many-to-many relationship with pivot table:

```typescript
class User extends Model {
  static relationships = {
    roles: {
      type: 'belongsToMany',
      model: () => Role,
      pivotTable: 'role_user',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    },
  }
}

// Access
const roles = await user.roles

// With pivot data
for (const role of roles) {
  console.log(role.pivot.created_at)
}
```

## Has One Through

```typescript
class User extends Model {
  static relationships = {
    phone: {
      type: 'hasOneThrough',
      model: () => Phone,
      through: () => Profile,
      firstKey: 'user_id',
      secondKey: 'profile_id',
    },
  }
}
```

## Has Many Through

```typescript
class Country extends Model {
  static relationships = {
    posts: {
      type: 'hasManyThrough',
      model: () => Post,
      through: () => User,
      firstKey: 'country_id',
      secondKey: 'user_id',
    },
  }
}
```

## Eager Loading

Load relationships to avoid N+1 queries:

```typescript
// Load single relationship
const users = await User.with('posts').get()

// Load multiple
const users = await User.with('posts', 'profile', 'roles').get()

// Constrained loading
const users = await User.with({
  posts: (query) => query.where('published', true).limit(5),
}).get()
```

## Querying Relationships

```typescript
// Where has relationship
const users = await User.whereHas('posts', (query) => {
  query.where('published', true)
}).get()

// Where doesnt have
const users = await User.whereDoesntHave('posts').get()
```

## Complete Example

```typescript
class User extends Model {
  static table = 'users'
  static fillable = ['name', 'email']

  static relationships = {
    posts: {
      type: 'hasMany',
      model: () => Post,
      foreignKey: 'user_id',
    },
    profile: {
      type: 'hasOne',
      model: () => Profile,
      foreignKey: 'user_id',
    },
    roles: {
      type: 'belongsToMany',
      model: () => Role,
      pivotTable: 'role_user',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    },
  }
}

class Post extends Model {
  static table = 'posts'
  static fillable = ['title', 'content', 'user_id']

  static relationships = {
    author: {
      type: 'belongsTo',
      model: () => User,
      foreignKey: 'user_id',
    },
  }
}

// Usage
const user = await User.with('posts', 'profile', 'roles').find(1)
console.log(user.posts.length)
console.log(user.profile.bio)
console.log(user.roles.map(r => r.name))
```

## Next Steps

- [Models](/packages/db/models) -- Working with models
- [Query Builder](/packages/db/query-builder) -- Fluent queries
- [Traits](/packages/db/traits) -- Model traits
