# @lara-node/db

Eloquent-style ORM for [Lara-Node](https://github.com/venomous-maker/vest) — MySQL and MongoDB with a unified API for models, migrations, seeders, relationships, observers, and transactions.

## Installation

```sh
pnpm add @lara-node/db
```

## Runtime Flag: `--expose-gc`

Always start your application with `--expose-gc`. It lets the ORM release connection pool and MongoDB client memory promptly after heavy operations.

```sh
# Dev server
node --expose-gc -r @swc-node/register src/server.ts

# Artisan
node --expose-gc -r @swc-node/register src/artisan.ts migrate
```

The `create-lara-node` scaffold injects `--expose-gc` into all generated `package.json` scripts automatically.

## Quick Start

```ts
import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';

@use(SoftDeletes, Timestamps)
export class User extends Model {
  static table    = 'users';
  static fillable = ['name', 'email', 'password'];
  static hidden   = ['password'];
  static casts    = { created_at: 'datetime', updated_at: 'datetime' };
}

// Create
const user = await User.create({ name: 'Alice', email: 'alice@example.com' });

// Query
const active = await User.where('status', 'active').orderBy('name').get();

// Find
const found = await User.findOrFail(1);

// Update
found.name = 'Alice B.';
await found.save();

// Soft delete
await found.delete();
await found.restore();
```

## Model Basics

### Static properties

| Property       | Type       | Default               | Description                                          |
|----------------|------------|-----------------------|------------------------------------------------------|
| `table`        | `string`   | plural of class name  | Table / collection name                              |
| `primaryKey`   | `string`   | `'id'`                | Primary key column                                   |
| `fillable`     | `string[]` | `[]`                  | Mass-assignable attributes                           |
| `guarded`      | `string[]` | `[]`                  | Blocked attributes                                   |
| `hidden`       | `string[]` | `[]`                  | Excluded from `toJSON()`                             |
| `appends`      | `string[]` | `[]`                  | Virtual accessors included in `toJSON()`             |
| `casts`        | `Casts`    | `{}`                  | Attribute casting (`datetime`, `json`, `int`, `float`, `boolean`) |
| `timestamps`   | `boolean`  | `true`                | Auto-manage `created_at` / `updated_at`              |
| `softDeletes`  | `boolean`  | `false`               | Set automatically by `SoftDeletes` trait             |
| `autoIncrement`| `boolean`  | `true`                | Whether PK is auto-incrementing                      |

### Querying

```ts
// All records
const users = await User.all();

// Find by PK
const user = await User.find(1);
const user = await User.findOrFail(1);  // throws 404 if missing

// Where / orWhere
const active = await User.where('status', 'active').get();
const admin  = await User.where('role', '=', 'admin').first();
const found  = await User.where('email', email).orWhere('phone', phone).first();

// WhereIn / WhereNull
const users = await User.whereIn('id', [1, 2, 3]).get();
const unverified = await User.whereNull('email_verified_at').get();

// Count / exists / aggregate
const count  = await User.where('status', 'active').count();
const exists = await User.where('email', email).exists();
const max    = await User.max('age');
const avg    = await User.avg('score');
const sum    = await User.sum('points');

// Select / pluck
const names  = await User.select(['id', 'name']).get();
const emails = await User.pluck('email');

// Ordering / limiting
const newest = await User.latest('created_at').get();
const oldest = await User.oldest().limit(5).get();

// Pagination
const page = await User.paginate(15, 1);
// { data, total, per_page, current_page, last_page }
```

### Creating and updating

```ts
const user = await User.create({ name: 'Alice', email: 'alice@example.com' });

user.name = 'Alice B.';
await user.save();

// Mass update
await User.where('status', 'pending').update({ status: 'active' });

// firstOrCreate / updateOrCreate
const user = await User.firstOrCreate(
  { email: 'bob@example.com' },
  { name: 'Bob', password: hash },
);

const user = await User.updateOrCreate(
  { email: 'bob@example.com' },
  { name: 'Bob Updated' },
);
```

### Deleting

```ts
await user.delete();              // soft delete (if trait applied), otherwise hard delete
await user.delete(true);          // force hard delete regardless of trait
await User.where('status', 'banned').delete();
```

## Casts

```ts
static casts = {
  created_at:  'datetime',  // Date object
  metadata:    'json',      // JSON.parse on read, JSON.stringify on write
  is_active:   'boolean',
  score:       'float',
  retry_count: 'int',
};
```

## Accessors and Mutators

```ts
export class User extends Model {
  // Accessor: getFullNameAttribute → user.full_name
  getFullNameAttribute() {
    return `${this.getAttribute('first_name')} ${this.getAttribute('last_name')}`;
  }

  // Mutator: setPasswordAttribute → called when user.password = '...'
  setPasswordAttribute(value: string) {
    this.setAttribute('password', bcrypt.hashSync(value, 12));
  }
}

// Expose in toJSON via appends
export class User extends Model {
  static appends = ['full_name'];
}
```

## Traits

Apply with the `@use()` decorator:

```ts
import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps, Sluggable, Sortable, Searchable, Cacheable } from '@lara-node/db';

@use(SoftDeletes, Timestamps, Sluggable)
export class Post extends Model {}
```

| Trait        | Adds                                                                                  |
|--------------|---------------------------------------------------------------------------------------|
| `SoftDeletes`| `delete()` sets `deleted_at`; `withTrashed()`, `onlyTrashed()`, `restore()`, `forceDelete()`, `trashed()` |
| `Timestamps` | Auto-fills `created_at` / `updated_at`; `touch()`                                    |
| `Sluggable`  | Auto-generates `slug` from `name` on save; `scopeFindBySlug()`                        |
| `Sortable`   | `moveUp()`, `moveDown()`, `reorder(ids[])`, `scopeOrdered()`                          |
| `Searchable` | `scopeSearch(query, fields[])`, `scopeAdvancedSearch(params)`                         |
| `Cacheable`  | `cached(fn, key, ttl)`, `clearCache()`, `getCached(id)`                               |

## Scopes

```ts
// Local scope
export class User extends Model {
  static localScopes = {
    active: (builder) => builder.where('status', 'active'),
  };

  // Instance scope method (resolved automatically)
  scopeVerified(builder) {
    builder.whereNotNull('email_verified_at');
  }
}

const active = await User.scope('active').get();
const verified = await User.scope('verified').get();

// Global scope
User.addGlobalScope('tenant', (builder) => {
  builder.where('tenant_id', currentTenantId());
});

// Remove global scope for one query
const all = await User.withoutGlobalScope('tenant').get();
const all = await User.query().withoutGlobalScope('tenant').get();
```

## Relationships

### hasOne / hasMany

```ts
export class User extends Model {
  profile() {
    return this.hasOne(UserProfile, 'user_id', 'id');
  }
  posts() {
    return this.hasMany(Post, 'user_id', 'id');
  }
}

const profile  = await user.profile().first();
const posts    = await user.posts().where('published', 1).get();
const newPost  = await user.posts().create({ title: 'Hello World' });
```

### belongsTo

```ts
export class Comment extends Model {
  post() {
    return this.belongsTo(Post, 'post_id', 'id');
  }
}

const post = await comment.post().first();
await comment.post().associate(post);
await comment.post().dissociate();
```

### belongsToMany

```ts
export class User extends Model {
  roles() {
    return this.belongsToMany(Role, 'roles_users', 'user_id', 'role_id');
  }
}

const roles = await user.roles().get();

await user.roles().attach([1, 2]);
await user.roles().attach([{ role_id: 1, granted_at: new Date() }]);  // pivot data
await user.roles().detach([1]);
await user.roles().sync([1, 2, 3]);
await user.roles().toggle([1, 2]);
await user.roles().updateExistingPivot(1, { granted_at: new Date() });

const roles = await user.roles().withPivot('granted_at').get();
roles[0].pivot.getAttribute('granted_at');
```

### Polymorphic

```ts
export class Post extends Model {
  image()    { return this.morphOne(Image, 'imageable', 'imageable_id', 'id'); }
  comments() { return this.morphMany(Comment, 'commentable', 'commentable_id', 'id'); }
}

export class Image extends Model {
  imageable() {
    return this.morphTo('imageable_type', 'imageable_id', { Post, Product });
  }
}
```

### Eager loading

```ts
const users = await User.with(['profile']).get();
const users = await User.with(['roles', 'roles.permissions']).get();

// Constrained eager loading
const users = await User.with({
  roles: (query) => query.where('active', 1).orderBy('name'),
}).get();
```

## Observers

```ts
import { Observer, Observe } from '@lara-node/db';
import { User } from '../Models/User';

@Observe(User)
export class UserObserver extends Observer<User> {
  creating(user: User): void {
    if (!user.getAttribute('status')) user.setAttribute('status', 'active');
  }

  created(user: User): void {
    console.log(`Created: ${user.getAttribute('email') as string}`);
  }

  updating(user: User): void {}
  updated(user: User): void {}
  deleting(user: User): void {}
  deleted(user: User): void {}
  restoring(user: User): void {}
  restored(user: User): void {}
  retrieved(user: User): void {}
}
```

Importing the observer file is sufficient — `@Observe(User)` wires it automatically. For manual registration: `User.observe(UserObserver)`.

| Operation       | Events fired (in order)                                    |
|-----------------|------------------------------------------------------------|
| `create`        | `saving` → `creating` → `created` → `saved`               |
| `save` (update) | `saving` → `updating` → `updated` → `saved`               |
| `delete`        | `deleting` → `deleted`                                     |
| `restore`       | `restoring` → `restored`                                   |
| `find` / `all`  | `retrieved`                                                |

## DB Facade

### Raw queries (MySQL)

```ts
import DB from '@lara-node/db';

const rows  = await DB.select('SELECT * FROM users WHERE id = ?', [1]);
const id    = await DB.insert('INSERT INTO users (name) VALUES (?)', ['Alice']);
const count = await DB.update('UPDATE users SET status = ? WHERE id = ?', ['active', 1]);
await DB.statement('ALTER TABLE users ADD COLUMN phone VARCHAR(20)');
```

### Table builder (MySQL)

```ts
const users = await DB.table('users').where('status', 'active').get();
await DB.table('users').where('id', 1).update({ status: 'inactive' });
await DB.table('users').insert({ name: 'Bob', email: 'bob@example.com' });
const user = await DB.table('users').where('id', 1).first();
```

### MongoDB collection

```ts
const col = DB.collection('users');
await col.insertOne({ name: 'Alice' });
await col.findOne({ email: 'alice@example.com' });
await col.updateOne({ _id }, { $set: { name: 'Alice B.' } });
await col.deleteOne({ _id });
```

### Transactions

```ts
// Auto-commit / rollback wrapper
await DB.transaction(async (trx) => {
  await User.create({ name: 'Alice' });
  await Invoice.create({ user_id: 1 });
});

// Manual
const trx = await DB.beginTransaction();
try {
  await User.create({ name: 'Bob' });
  await DB.commit();
} catch {
  await DB.rollback();
}

// Type-safe MySQL
await DB.mysqlTransaction(async (trx) => {
  const id = await trx.insert('INSERT INTO users (name) VALUES (?)', ['Bob']);
  await trx.update('UPDATE counters SET total = total + 1');
});

// Type-safe MongoDB
await DB.mongoTransaction(async (trx) => {
  const col = trx.collection('users');
  await col.insertOne({ name: 'Carol' }, { session: trx.getSession() });
});
```

## Schema Builder (Migrations)

### MySQL migration

```ts
import Schema, { TableBuilder } from '@lara-node/db';
import type { MigrationSchema, QueryFn } from '@lara-node/db';

export async function up(schema: MigrationSchema, query: QueryFn) {
  await query(
    schema.createTable('users', (table: TableBuilder) => {
      table.id();
      table.string('name');
      table.string('email', 191).unique();
      table.string('password');
      table.enum('status', ['active', 'inactive']).default('active');
      table.boolean('email_verified').default(false);
      table.json('metadata').nullable();
      table.timestamps();
      table.softDeletes();
    }),
  );
}

export async function down(schema: MigrationSchema, query: QueryFn) {
  await query(schema.dropTableIfExists('users'));
}
```

### Column types

| Method                          | MySQL type                        |
|---------------------------------|-----------------------------------|
| `id()`                          | `BIGINT UNSIGNED AUTO_INCREMENT`  |
| `string(name, length?)`         | `VARCHAR(255)`                    |
| `text()` / `longText()`         | `TEXT` variants                   |
| `integer()` / `bigInteger()`    | `INT` variants                    |
| `decimal(name, precision, scale)` | `DECIMAL`                       |
| `boolean()`                     | `TINYINT(1)`                      |
| `datetime()` / `date()`         | date/time                         |
| `timestamps()`                  | `created_at` + `updated_at`       |
| `softDeletes()`                 | `deleted_at TIMESTAMP NULL`       |
| `json()`                        | `JSON`                            |
| `enum(name, values[])`          | `ENUM`                            |
| `foreignId(name)`               | `BIGINT UNSIGNED`                 |
| `uuid()`                        | `CHAR(36)`                        |
| `morphs(name)`                  | `{name}_type` + `{name}_id` + index |

### Indexes and foreign keys

```ts
table.index(['tenant_id', 'status'], 'tenant_status_idx')
table.uniqueIndex(['email', 'tenant_id'])
table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
```

### MongoDB migration

```ts
import { MongoSchema, TableBuilder } from '@lara-node/db';

export async function up(schema: MongoSchema) {
  schema.createTable('users', (table: TableBuilder) => {
    table.unique('email');
    table.index(['status', 'created_at'], 'users_status_date_idx');
  });
  await schema.apply();
}
```

## Seeders

```ts
// database/seeders/UserSeeder.ts
export async function run() {
  await User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
}
```

```sh
node artisan db:seed
```

## DatabaseServiceProvider

```ts
import { DatabaseServiceProvider } from '@lara-node/db';

// In AppServiceProvider
this.app.register(DatabaseServiceProvider);
```

Set `SKIP_DB=1` to bypass initialization in test or CI environments.

## Environment Variables

| Variable                             | Default     | Description                                              |
|--------------------------------------|-------------|----------------------------------------------------------|
| `DB_CONNECTION`                      | `mysql`     | Driver: `mysql` or `mongodb`                            |
| `DB_NAME`                            | `test`      | Database / schema name                                   |
| `DB_HOST`                            | `localhost` | MySQL host / MongoDB host (when `MONGO_URI` not set)    |
| `DB_PORT`                            | `3306`      | MySQL port (`27017` for MongoDB)                         |
| `DB_USER`                            | `root`      | MySQL user                                               |
| `DB_PASSWORD`                        | _(empty)_   | MySQL password                                           |
| `DB_POOL_LIMIT`                      | `10`        | MySQL connection pool size                               |
| `DB_SOCKET_PATH`                     | —           | Unix socket path for MySQL (overrides host/port)         |
| `MONGO_URI`                          | —           | Full MongoDB connection string                           |
| `MONGO_REPLICA_SET`                  | —           | Replica set name; enables replica-set mode               |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS`  | `10000`     | Server selection timeout (ms)                            |
| `SKIP_DB`                            | —           | Set to `1` to skip DB init in CI                         |
