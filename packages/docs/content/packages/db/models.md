# Models

Models in LaraNode provide an expressive, Eloquent-inspired way to interact with your database.

## Defining Models

Extend the `Model` class:

```typescript
import { Model } from "@lara-node/db";

class User extends Model {
  static table = "users";
  static primaryKey = "id";
  static fillable = ["name", "email", "password"];
  static hidden = ["password"];
  static timestamps = true;
}
```

## Model Properties

| Property      | Default               | Description                |
| ------------- | --------------------- | -------------------------- |
| `table`       | Pluralized class name | Database table name        |
| `primaryKey`  | `'id'`                | Primary key column         |
| `fillable`    | `[]`                  | Mass-assignable attributes |
| `guarded`     | `[]`                  | Non-assignable attributes  |
| `hidden`      | `[]`                  | Hidden from JSON           |
| `appends`     | `[]`                  | Appended to JSON           |
| `casts`       | `{}`                  | Attribute type casting     |
| `timestamps`  | `true`                | Auto-manage timestamps     |
| `softDeletes` | `false`               | Enable soft deletes        |

## Creating Records

```typescript
// Create and save
const user = await User.create({
  name: "John",
  email: "john@example.com",
});

// Create instance and save
const user = new User();
user.name = "John";
user.email = "john@example.com";
await user.save();

// First or create
const user = await User.firstOrCreate({ email: "john@example.com" }, { name: "John" });

// Update or create
const user = await User.updateOrCreate({ email: "john@example.com" }, { name: "John" });
```

## Retrieving Records

```typescript
// Find by primary key
const user = await User.find(1);

// All records
const users = await User.all();

// First record
const user = await User.first();

// With conditions
const users = await User.where("active", true).get();

// Multiple conditions
const users = await User.where("active", true).where("role", "admin").get();
```

## Updating Records

```typescript
// Find and update
const user = await User.find(1);
await user.update({ name: "Jane" });

// Update by query
await User.where("role", "user").update({ status: "active" });

// Increment/decrement
await User.find(1).increment("login_count");
await User.find(1).decrement("credits", 10);
```

## Deleting Records

```typescript
// Delete instance
const user = await User.find(1);
await user.delete();

// Delete by query
await User.where("inactive", true).delete();
```

## Accessors and Mutators

Define getters and setters for attributes:

```typescript
class User extends Model {
  static table = "users";

  // Accessor
  getFullName() {
    return `${this.first_name} ${this.last_name}`;
  }

  // Mutator
  setPasswordAttribute(value: string) {
    this.attributes.password = hashPassword(value);
  }
}
```

## Attribute Casting

```typescript
class User extends Model {
  static casts = {
    is_admin: "boolean",
    email_verified_at: "date",
    settings: "json",
    age: "integer",
    balance: "float",
  };
}
```

## Serialization

```typescript
const user = await User.find(1);

// To JSON (respects hidden/appends)
const json = user.toJSON();

// To plain object
const data = user.toObject();
```

## Next Steps

- [Query Builder](/packages/db/query-builder) -- Fluent queries
- [Relationships](/packages/db/relationships) -- Model relationships
- [Traits](/packages/db/traits) -- Model traits
