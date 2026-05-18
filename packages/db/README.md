# @lara-node/db

Eloquent-style ORM for [Lara-Node](https://github.com/venomous-maker/vest) — supports MySQL and MongoDB with a unified API for models, migrations, seeders, relationships, observers, transactions, and schema building.

## Installation

```bash
pnpm add @lara-node/db
```

---

## Runtime Flag: `--expose-gc`

Always start your application with Node's `--expose-gc` flag. It enables explicit garbage collection calls so the ORM can release connection pool memory and MongoDB client memory promptly after heavy operations, preventing heap bloat in long-running processes.

### Dev server

```bash
node --expose-gc -r @swc-node/register -r tsconfig-paths/register -r ./src/register.ts src/server.ts
# or via the generated script:
pnpm dev
```

### Artisan CLI

```bash
node --expose-gc -r @swc-node/register -r tsconfig-paths/register -r ./src/register.ts src/artisan.ts migrate
node --expose-gc -r @swc-node/register -r tsconfig-paths/register -r ./src/register.ts src/artisan.ts db:seed
# or via the generated scripts:
pnpm artisan migrate
pnpm artisan db:seed
```

### Queue worker

```bash
node --expose-gc -r @swc-node/register -r tsconfig-paths/register -r ./src/register.ts src/artisan.ts queue:work
# or:
pnpm artisan queue:work
```

### Horizon (queue dashboard)

```bash
node --expose-gc -r @swc-node/register -r tsconfig-paths/register -r ./src/register.ts src/artisan.ts horizon:serve
# or:
pnpm artisan horizon:serve
```

> **Note:** The `create-lara-node` scaffold injects `--expose-gc` into all generated `package.json` scripts automatically so you do not need to add it yourself in scaffolded projects.

---

## Environment Variables

All variables are read **lazily** (at call time, not at import time) so dotenv can be loaded in any order.

### Common

| Variable | Default | Description |
|---|---|---|
| `DB_CONNECTION` | `mysql` | Driver: `mysql` or `mongodb` |
| `DB_DRIVER` | — | Alias for `DB_CONNECTION` |
| `DB_NAME` | `test` | Database / schema name |
| `SKIP_DB` | — | Set to `1` or `true` to skip DB init (useful in CI) |

### MySQL

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | _(empty)_ | MySQL password |
| `DB_POOL_LIMIT` | `10` | Connection pool size |
| `DB_SOCKET_PATH` | — | Unix socket path (overrides host/port) |
| `DB_SOCKET` | — | Alias for `DB_SOCKET_PATH` |

### MongoDB

| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | — | Full connection string — takes precedence over host/port |
| `MONGODB_URI` | — | Alias for `MONGO_URI` |
| `DB_HOST` | `localhost` | Used to build default URI when `MONGO_URI` is not set |
| `DB_PORT` | `27017` | Used to build default URI when `MONGO_URI` is not set |
| `MONGO_REPLICA_SET` | — | Replica set name; enables replica-set mode |
| `MONGO_DIRECT_CONNECTION` | auto | `true` for standalone, `false` for replica set |
| `MONGO_RETRY_WRITES` | auto | `true` for replica set, `false` for standalone |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` | `10000` | Server selection timeout in ms |

### .env example

```dotenv
# ── Common ────────────────────────────────────────────────────────────────
DB_CONNECTION=mysql          # or mongodb

# ── MySQL ─────────────────────────────────────────────────────────────────
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=my_app
DB_USER=my_user
DB_PASSWORD=secret
DB_POOL_LIMIT=10
# DB_SOCKET_PATH=/var/run/mysqld/mysqld.sock   # use instead of host/port on Linux

# ── MongoDB ───────────────────────────────────────────────────────────────
# MONGO_URI=mongodb://user:pass@localhost:27017/my_app?authSource=admin
# MONGO_REPLICA_SET=rs0
# MONGO_DIRECT_CONNECTION=true
# MONGO_RETRY_WRITES=false

# ── Misc ──────────────────────────────────────────────────────────────────
# SKIP_DB=1    # skip DB init in test / CI environments
```

---

## Quick Start

```typescript
import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';

@use(SoftDeletes, Timestamps)
export class User extends Model {
  static table    = 'users';
  static fillable = ['name', 'email', 'password'];
  static hidden   = ['password'];
  static casts    = { created_at: 'datetime', updated_at: 'datetime' };
}
```

---

## Model Basics

### Static properties

| Property | Type | Default | Description |
|---|---|---|---|
| `table` | `string` | plural of class name | Table / collection name |
| `primaryKey` | `string` | `'id'` | Primary key column |
| `fillable` | `string[]` | `[]` | Mass-assignable attributes |
| `guarded` | `string[]` | `[]` | Blocked attributes |
| `hidden` | `string[]` | `[]` | Excluded from `toJSON()` |
| `appends` | `string[]` | `[]` | Virtual accessors to include in `toJSON()` |
| `casts` | `Casts` | `{}` | Attribute casting (`datetime`, `json`, `int`, `float`, `boolean`) |
| `timestamps` | `boolean` | `true` | Auto-manage `created_at` / `updated_at` |
| `softDeletes` | `boolean` | `false` | Set by `SoftDeletes` trait |
| `autoIncrement` | `boolean` | `true` | Whether PK is auto-incrementing |

### Querying

```typescript
// All records
const users = await User.all();

// Find by primary key
const user = await User.find(1);
const user = await User.findOrFail(1);  // throws 404 if missing

// Where
const active = await User.where('status', 'active').get();
const admin  = await User.where('role', '=', 'admin').first();

// Multiple conditions
const results = await User
  .where('status', 'active')
  .where('age', '>', 18)
  .orderBy('name')
  .limit(20)
  .get();

// OrWhere
const found = await User
  .where('email', email)
  .orWhere('phone', phone)
  .first();

// WhereIn / WhereNotIn
const users = await User.whereIn('id', [1, 2, 3]).get();

// WhereNull / WhereNotNull
const unverified = await User.whereNull('email_verified_at').get();

// Count / exists
const count = await User.where('status', 'active').count();
const exists = await User.where('email', email).exists();

// Pagination
const page = await User.paginate(15, 1);
// → { data, total, per_page, current_page, last_page }

// Select specific columns
const names = await User.select(['id', 'name']).get();

// Pluck a single column
const emails = await User.pluck('email');

// OrderBy / latest / oldest
const newest = await User.latest('created_at').get();
const oldest = await User.oldest().limit(5).get();

// Aggregate
const max = await User.where('active', 1).max('age');
const min = await User.min('age');
const avg = await User.avg('score');
const sum = await User.sum('points');
```

### Creating & Updating

```typescript
// Create
const user = await User.create({ name: 'Alice', email: 'alice@example.com' });

// Update via instance
user.name = 'Alice B.';
await user.save();

// Mass update via builder
await User.where('status', 'pending').update({ status: 'active' });

// firstOrCreate / firstOrNew / updateOrCreate
const user = await User.firstOrCreate(
  { email: 'bob@example.com' },
  { name: 'Bob', password: hashed }
);

const user = await User.updateOrCreate(
  { email: 'bob@example.com' },
  { name: 'Bob Updated', updated_at: new Date() }
);
```

### Deleting

```typescript
await user.delete();                    // soft delete if trait applied, else hard delete
await user.delete(true);               // force hard delete
await User.where('status', 'banned').delete();
```

---

## Casts

```typescript
static casts = {
  created_at:    'datetime',   // Date object
  updated_at:    'datetime',
  metadata:      'json',       // JSON.parse on read, JSON.stringify on write
  is_active:     'boolean',
  score:         'float',
  retry_count:   'int',
};
```

---

## Accessors & Mutators

```typescript
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

// Expose accessors in toJSON / appends
export class User extends Model {
  static appends = ['full_name'];

  getFullNameAttribute() { ... }
}
```

---

## Traits

Apply traits with the `@use()` class decorator:

```typescript
import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps, Sluggable, Sortable, Searchable, Cacheable } from '@lara-node/db';

@use(SoftDeletes, Timestamps, Sluggable)
export class Post extends Model { ... }
```

| Trait | Adds |
|---|---|
| `SoftDeletes` | `delete()` sets `deleted_at`; `withTrashed()`, `onlyTrashed()`, `restore()`, `forceDelete()`, `trashed()` |
| `Timestamps` | Auto-fills `created_at` / `updated_at`; `touch()` |
| `Sluggable` | Auto-generates `slug` from `name` on save; `scopeFindBySlug()` |
| `Sortable` | `moveUp()`, `moveDown()`, `reorder(ids[])`, `scopeOrdered()` |
| `Searchable` | `scopeSearch(query, fields[])`, `scopeAdvancedSearch(params)` |
| `Cacheable` | `cached(fn, key, ttl)`, `clearCache()`, `getCached(id)` |

### SoftDeletes in detail

```typescript
await user.delete();                         // sets deleted_at
await user.restore();                        // clears deleted_at
await user.forceDelete();                    // permanent delete

// Querying soft-deleted records
await User.withTrashed().get();              // include deleted
await User.onlyTrashed().get();             // only deleted
await User.where('name', 'Alice').get();    // excludes deleted automatically
```

---

## Scopes

### Local scopes

```typescript
export class User extends Model {
  static localScopes = {
    active: (builder) => builder.where('status', 'active'),
  };
}

// Usage
const active = await User.scope('active').get();
```

### Global scopes

```typescript
User.addGlobalScope('tenant', (builder) => {
  builder.where('tenant_id', currentTenantId());
});

// Remove a global scope for one query
const all = await User.withoutGlobalScope('tenant').get();
```

---

## Relationships

### HasOne

```typescript
export class User extends Model {
  profile() {
    return this.hasOne(UserProfile, 'user_id', 'id');
  }
}

const profile = await user.profile().first();
const profile = await user.profile().withDefault({ gender: 'unknown' }).first();

// Create via relation
const newProfile = await user.profile().create({ city: 'Nairobi' });
await user.profile().associate(existingProfile);
await user.profile().dissociate();
```

### HasMany

```typescript
export class Post extends Model {
  comments() {
    return this.hasMany(Comment, 'post_id', 'id');
  }
}

const comments = await post.comments().get();
const comment  = await post.comments().create({ body: 'Great!' });
const many     = await post.comments().createMany([{ body: 'A' }, { body: 'B' }]);
await post.comments().attach(existingComment);
await post.comments().detach(commentId);
const result = await post.comments().sync([comment1, comment2]);
// → { attached: [], detached: [], updated: [] }
```

### BelongsTo

```typescript
export class Comment extends Model {
  post() {
    return this.belongsTo(Post, 'post_id', 'id');
  }
}

const post = await comment.post().first();
await comment.post().associate(post);
await comment.post().dissociate();
```

### BelongsToMany

```typescript
export class User extends Model {
  roles() {
    return this.belongsToMany(
      Role,
      'roles_users',   // pivot table
      'user_id',       // foreign key on pivot
      'role_id',       // related key on pivot
      'id',            // local primary key (default)
      'id',            // related primary key (default)
    );
  }
}

const roles = await user.roles().get();

// Pivot management
await user.roles().attach([1, 2]);
await user.roles().attach([{ role_id: 1, granted_at: new Date() }]);   // with extra pivot data
await user.roles().detach([1]);
await user.roles().detach();                                              // detach all
const result = await user.roles().sync([1, 2, 3]);
const result = await user.roles().toggle([1, 2]);
await user.roles().updateExistingPivot(1, { granted_at: new Date() });

// Access pivot data
const roles = await user.roles().withPivot('granted_at').get();
roles[0].pivot.getAttribute('granted_at');

// Filter by pivot column
const active = await user.roles().wherePivot('active', 1).get();
```

### HasOneThrough

```typescript
export class User extends Model {
  insurance() {
    // User → Policy (via policies.user_id) → Insurance (via insurances.policy_id)
    return this.hasOneThrough(Insurance, Policy, 'user_id', 'policy_id', 'id', 'id');
  }
}

const insurance = await user.insurance().first();
```

### HasManyThrough

```typescript
export class Country extends Model {
  posts() {
    // Country → User (via users.country_id) → Post (via posts.user_id)
    return this.hasManyThrough(Post, User, 'country_id', 'user_id', 'id', 'id');
  }
}

const posts = await country.posts().get();
```

### Polymorphic: MorphOne / MorphMany

```typescript
export class Post extends Model {
  image() {
    return this.morphOne(Image, 'imageable', 'imageable_id', 'id');
  }
  comments() {
    return this.morphMany(Comment, 'commentable', 'commentable_id', 'id');
  }
}

const image   = await post.image().first();
const comment = await post.comments().create({ body: 'Nice!' });
```

### Polymorphic: MorphTo

```typescript
export class Image extends Model {
  imageable() {
    return this.morphTo('imageable_type', 'imageable_id', {
      Post:    Post,
      Product: Product,
    });
  }
}

const owner = await image.imageable().first();
```

### Eager Loading

```typescript
// Single relation
const users = await User.with(['profile']).get();

// Nested relations (any depth)
const users = await User.with(['roles', 'roles.permissions']).get();

// Constrained eager loading
const users = await User.with({
  roles: (query) => query.where('active', 1).orderBy('name'),
}).get();

// Access loaded relation
users[0].profile;       // UserProfile instance
users[0].roles;         // Role[] array
```

---

## Fluent Relation Builder

Every relation object is also a Promise and a query builder:

```typescript
// Await directly — resolves via getResults()
const profile  = await user.profile();
const comments = await post.comments();

// Chain builder methods before executing
const recent = await user.posts()
  .where('published', 1)
  .orderBy('created_at', 'desc')
  .limit(10)
  .get();

// Use .query() to get a bare EloquentBuilder
const builder = user.posts().query().where('published', 1);
```

---

## Observers

Observers intercept model lifecycle events.

### With `@Observe` decorator

```typescript
import { Observer, Observe } from '@lara-node/db';
import { User } from '../Models/User';

@Observe(User)
export class UserObserver extends Observer<User> {
  creating(user: User): void {
    if (!user.getAttribute('status')) user.setAttribute('status', 'active');
  }

  created(user: User): void {
    console.log(`User created: ${user.getAttribute('email') as string}`);
  }

  updating(user: User): void {
    user.setAttribute('updated_at', new Date());
  }

  updated(user: User): void { /* ... */ }

  saving(user: User): void { /* fires for both create and update */ }
  saved(user: User): void { /* ... */ }

  deleting(user: User): void { /* ... */ }
  deleted(user: User): void { /* ... */ }

  restoring(user: User): void { /* only with SoftDeletes */ }
  restored(user: User): void { /* ... */ }

  retrieved(user: User): void { /* fires after any fetch */ }
}
```

Importing the observer file is enough — `@Observe(User)` wires it automatically.

### Manual registration

```typescript
User.observe(UserObserver);
```

### Lifecycle event order

| Operation | Events fired (in order) |
|---|---|
| `create` | `saving` → `creating` → `created` → `saved` |
| `save` (update) | `saving` → `updating` → `updated` → `saved` |
| `delete` | `deleting` → `deleted` |
| `restore` | `restoring` → `restored` |
| `find` / `all` | `retrieved` |

---

## DB Facade

### Raw queries (MySQL)

```typescript
import DB from '@lara-node/db';

const rows   = await DB.select('SELECT * FROM users WHERE id = ?', [1]);
const id     = await DB.insert('INSERT INTO users (name) VALUES (?)', ['Alice']);
const count  = await DB.update('UPDATE users SET status = ? WHERE id = ?', ['active', 1]);
const rows2  = await DB.delete('DELETE FROM users WHERE id = ?', [99]);
await DB.statement('ALTER TABLE users ADD COLUMN phone VARCHAR(20)');
await DB.unprepared('SET FOREIGN_KEY_CHECKS = 0');
```

### Table builder (MySQL)

```typescript
const users = await DB.table('users')
  .where('status', 'active')
  .get();

await DB.table('users')
  .where('id', 1)
  .update({ status: 'inactive' });

await DB.table('users')
  .where('id', 1)
  .delete();

await DB.table('users')
  .insert({ name: 'Bob', email: 'bob@example.com' });

const count = await DB.table('users').where('status', 'active').count();
const user  = await DB.table('users').where('id', 1).first();
```

### MongoDB collection

```typescript
const col = DB.collection('users');
await col.insertOne({ name: 'Alice' });
await col.findOne({ email: 'alice@example.com' });
await col.updateOne({ _id }, { $set: { name: 'Alice B.' } });
await col.deleteOne({ _id });
```

### Transactions

```typescript
// Auto-commit / rollback wrapper (MySQL or MongoDB)
await DB.transaction(async (trx) => {
  await User.create({ name: 'Alice' });    // automatically uses the active transaction
  await Invoice.create({ user_id: 1 });
});

// Manual transaction
const trx = await DB.beginTransaction();
try {
  await User.create({ name: 'Bob' });
  await DB.commit();
} catch {
  await DB.rollback();
}

// Type-safe MySQL transaction
await DB.mysqlTransaction(async (trx) => {
  const id = await trx.insert('INSERT INTO users (name) VALUES (?)', ['Bob']);
  await trx.update('UPDATE counters SET total = total + 1');
});

// Type-safe MongoDB transaction
await DB.mongoTransaction(async (trx) => {
  const col = trx.collection('users');
  await col.insertOne({ name: 'Carol' }, { session: trx.getSession() });
});
```

### Utility

```typescript
DB.raw('NOW()');                  // raw SQL expression
DB.escape("Alice's");             // escape a value
DB.quoteName('user_id');          // wrap identifier in backticks
DB.isMysql();                     // boolean
DB.isMongo();                     // boolean
DB.getType();                     // 'mysql' | 'mongodb'
DB.inTransaction();               // boolean
DB.getTransactionLevel();         // number
```

---

## Schema Builder (Migrations)

### MySQL migration

```typescript
import Schema, { TableBuilder } from '@lara-node/db';
import type { MigrationSchema, QueryFn } from '@lara-node/db';

export async function up(schema: MigrationSchema, query: QueryFn) {
  await query(
    schema.createTable('users', (table: TableBuilder) => {
      table.id();                                   // BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
      table.string('name');                          // VARCHAR(255)
      table.string('email', 191).unique();
      table.string('password');
      table.enum('status', ['active', 'inactive']).default('active');
      table.boolean('email_verified').default(false);
      table.json('metadata').nullable();
      table.timestamps();                            // created_at, updated_at
      table.softDeletes();                           // deleted_at
    }),
  );
}

export async function down(schema: MigrationSchema, query: QueryFn) {
  await query(schema.dropTableIfExists('users'));
}
```

### Column types

| Method | MySQL type |
|---|---|
| `id()` | `BIGINT UNSIGNED AUTO_INCREMENT` |
| `bigIncrements()` | `BIGINT UNSIGNED AUTO_INCREMENT` |
| `increments()` | `INT UNSIGNED AUTO_INCREMENT` |
| `uuid()` | `CHAR(36)` |
| `ulid()` | `CHAR(26)` |
| `string(name, length?)` | `VARCHAR(255)` |
| `char(name, length?)` | `CHAR` |
| `text()` / `longText()` / `mediumText()` / `tinyText()` | `TEXT` variants |
| `integer()` / `bigInteger()` / `smallInteger()` / `tinyInteger()` / `mediumInteger()` | `INT` variants |
| `unsignedInteger()` / `unsignedBigInteger()` etc. | unsigned variants |
| `decimal(name, precision, scale)` | `DECIMAL` |
| `float()` / `double()` | `FLOAT` / `DOUBLE` |
| `boolean()` | `TINYINT(1)` |
| `datetime()` / `date()` / `time()` | date/time |
| `timestamp()` | `TIMESTAMP NULL` |
| `timestamps()` | `created_at` + `updated_at` |
| `softDeletes()` | `deleted_at TIMESTAMP NULL` |
| `json()` / `jsonb()` | `JSON` |
| `binary()` | `BLOB` / `VARBINARY` |
| `enum(name, values[])` | `ENUM` |
| `foreignId(name)` | `BIGINT UNSIGNED` |
| `ipAddress()` | `VARCHAR(45)` |
| `macAddress()` | `VARCHAR(17)` |
| `rememberToken()` | `VARCHAR(100) NULL` |
| `morphs(name)` | `{name}_type VARCHAR + {name}_id BIGINT UNSIGNED + index` |
| `geometry()` / `point()` / `polygon()` etc. | geometry types |

### Column modifiers

```typescript
table.string('name').nullable()
table.string('slug').unique()
table.integer('order').unsigned().default(0)
table.string('bio').nullable().after('email')
table.timestamp('verified_at').nullable().useCurrent()
table.datetime('updated_at').useCurrentOnUpdate()
table.string('code').comment('ISO 3166-1 alpha-2')
table.string('data').charset('utf8mb4').collate('utf8mb4_unicode_ci')
table.integer('amount').virtualAs('price * quantity')
table.integer('total').storedAs('price * quantity')
```

### Indexes & foreign keys

```typescript
table.index(['tenant_id', 'status'], 'tenant_status_idx')
table.uniqueIndex(['email', 'tenant_id'])
table.foreignKey('user_id', 'users', 'id', { onDelete: 'CASCADE' })

// Fluent foreign key
table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
```

### Alter table

```typescript
export async function up(schema: MigrationSchema, query: QueryFn) {
  await query(
    schema.alterTable('users', (table: TableBuilder) => {
      table.string('phone', 20).nullable().after('email');   // add column
      table.dropColumn('legacy_field');                       // drop column
      table.renameColumn('full_name', 'name');               // rename
      table.index(['phone'], 'users_phone_idx');             // add index
      table.dropIndex('old_idx_name');                       // drop index
    }),
  );
}
```

### Schema introspection

```typescript
const s = new Schema(queryFn);
await s.hasTable('users');
await s.hasColumn('users', 'email');
await s.hasColumns('users', ['email', 'name']);
await s.getColumnType('users', 'email');
await s.getColumnListing('users');
await s.getAllTables();
s.disableForeignKeyConstraints();
s.enableForeignKeyConstraints();
```

### MongoDB migrations

```typescript
import { MongoSchema, TableBuilder } from '@lara-node/db';

export async function up(schema: MongoSchema) {
  schema.createTable('users', (table: TableBuilder) => {
    table.unique('email');
    table.index(['status', 'created_at'], 'users_status_date_idx');
  });
  await schema.apply();
}
```

---

## Seeders

```typescript
// database/seeders/UserSeeder.ts
export async function run() {
  await User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
}
```

Run via artisan:

```bash
pnpm artisan db:seed
```

---

## `DatabaseServiceProvider`

Registers the DB connection in the IoC container and calls `initDatabase()` during boot.

```typescript
import { DatabaseServiceProvider } from '@lara-node/db';

// In AppServiceProvider
this.app.register(DatabaseServiceProvider);
```

Set `SKIP_DB=1` to bypass initialization in test / CI environments where no DB is available.

---

## What's New

### Builder-level `withoutGlobalScope`

Exclude a specific global scope from a single query without touching static class state:

```typescript
// Remove the 'tenant' scope for this query only
const all = await User.query().withoutGlobalScope('tenant').get();

// Static helper (unchanged signature)
const all = await User.withoutGlobalScope('tenant').get();
```

### Instance scope methods

`scope()` now resolves both static and instance (prototype) scope methods:

```typescript
export class User extends Model {
  // Instance scope method — gets hoisted to prototype, works via scope()
  scopeActive(builder: EloquentBuilder<User>) {
    builder.where('status', 'active');
  }
}

const active = await User.scope('active').get();
```

### Dirty-attribute tracking (`_changes`)

`Model` now tracks which attributes changed since the last save in a `_changes` map. Observers and lifecycle hooks can read it via `model.getChanges()` (if exposed) or via the protected `_changes` property in subclasses.

### Accessor snake_case fix

Accessors are now correctly matched using full StudlyCase conversion. A `getFullNameAttribute()` accessor is now properly triggered when accessing `model.full_name` (previously required exact capitalisation of the first segment only).

---

## Exports

```typescript
// Core
import { Model, use, EloquentBuilder }         from '@lara-node/db';
import { DB }                                   from '@lara-node/db';
import { initDatabase, getDbType, closeDatabase, getPool, getMongoDb, collection } from '@lara-node/db';
import { DatabaseServiceProvider }              from '@lara-node/db';

// Relationships
import { HasOne, HasMany, BelongsTo, BelongsToMany, HasOneThrough, HasManyThrough } from '@lara-node/db';

// Observers & decorators
import { Observer, Observe }                    from '@lara-node/db';

// Traits
import { SoftDeletes, Timestamps, Sluggable, Sortable, Searchable, Cacheable } from '@lara-node/db';

// Schema / migrations / seeders
import Schema, { TableBuilder, MongoSchema, raw } from '@lara-node/db';
import { runMigrations, rollbackMigrations, makeMigration, migrateFresh } from '@lara-node/db';
import { runSeeders }                           from '@lara-node/db';

// Test helpers
import { __setMongoDbForTest, __setPoolForTest } from '@lara-node/db';
```

---

## License

MIT
