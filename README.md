# Lara-Node

A Laravel-inspired Node.js framework for building production-ready REST APIs — structured, expressive, and batteries-included.

```bash
pnpm create lara-node my-api
```

---

## Features

- **Expressive routing** — fluent route builder with named middleware, groups, and parameter constraints
- **Eloquent-style ORM** — models with relationships, traits (SoftDeletes, Timestamps, Cacheable…), and Mongo/MySQL support
- **Service container** — IoC container with auto-injection and service providers
- **Global config system** — dot-notation `config()` accessor; packages set defaults, app overrides via `ConfigServiceProvider`
- **Middleware service provider** — register aliases (`auth`, `can`, `role`), groups, and priority order in a dedicated provider
- **Class-based middleware** — pass constructor classes directly; the engine calls `handle()` automatically
- **Event system** — synchronous and queued events, listeners, subscribers, and WebSocket broadcasting
- **Job queue** — driver-based queue (sync, MongoDB, Redis) with retries, priorities, and failed-job tracking
- **Cron scheduler** — fluent task scheduling with distributed locking
- **Mail** — SMTP, log, and array drivers with Mailable classes; runtime config via `config('mail.*')`
- **Artisan CLI** — 50+ built-in commands; add your own with a single class
- **`artisan serve`** — auto port fallback (tries next port sequentially if current one is in use)
- **`vendor:publish`** — copies package config templates to `src/config/` for app-level customization
- **Telescope** — request, query, job, log, exception, and cache watcher with a live dashboard
- **Horizon** — queue supervisor dashboard with auto-scaling workers
- **OpenAPI docs** — auto-generated Swagger UI from route and controller decorators

---

## Requirements

- Node.js 20+
- pnpm 9+
- MongoDB or MySQL

---

## Quick Start

```bash
pnpm create lara-node my-api
cd my-api
cp .env.example .env        # set DB_CONNECTION, DB_NAME, JWT_SECRET
pnpm install
pnpm artisan key:generate --write
pnpm artisan migrate
pnpm artisan serve
```

Server starts at `http://localhost:3000` (auto-increments if port is busy).  
API docs at `http://localhost:3000/docs`.

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@lara-node/core` | 0.1.4 | IoC container, Application, ServiceProvider, global config, MiddlewareStack |
| `@lara-node/db` | 0.1.2 | ORM models, relationships, migrations, schema builder |
| `@lara-node/router` | 0.1.3 | Route builder, middleware stack, HTTP kernel, OpenAPI |
| `@lara-node/auth` | 0.1.2 | JWT auth, bcrypt helpers |
| `@lara-node/cache` | 0.1.2 | Cache drivers (file, Redis, DB, memory), rate limiter |
| `@lara-node/events` | 0.1.3 | Event dispatcher, listeners, subscribers, broadcasting |
| `@lara-node/queue` | 0.1.3 | Job queue, scheduler, workers |
| `@lara-node/mail` | 0.1.3 | Mailers, drivers (SMTP, log, array) |
| `@lara-node/console` | 0.1.5 | Artisan CLI kernel, 50+ commands, vendor:publish |
| `@lara-node/middlewares` | 0.1.7 | Built-in middleware classes (Auth, RBAC, Throttle…) |
| `@lara-node/validator` | 0.1.6 | Laravel-style validation rules |
| `@lara-node/horizon` | 0.1.4 | Queue supervisor + dashboard |
| `@lara-node/telescope` | 0.1.4 | Debug & observability dashboard |
| `create-lara-node` | 0.2.4 | Project scaffolding (`pnpm create lara-node`) |

All packages publish with semver ranges (`^x.y.z`) on their internal dependencies so pnpm resolves a single shared instance of `@lara-node/core` in every project.

---

## Project Structure

```
my-api/
├── src/
│   ├── server.ts                   # HTTP entry point
│   ├── artisan.ts                  # CLI entry point
│   ├── register.ts                 # tsconfig-paths + reflect-metadata bootstrap
│   ├── bootstrap/
│   │   └── app.ts                  # Application bootstrap & boot sequences
│   ├── routes/
│   │   ├── api.ts                  # API routes
│   │   └── web.ts                  # Web routes
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Kernel.ts           # Global middleware pipeline
│   │   │   ├── Controllers/        # Route controllers
│   │   │   └── Middleware/         # Custom middleware classes
│   │   ├── Models/                 # Eloquent models
│   │   ├── Events/                 # Event classes
│   │   ├── Listeners/              # Event listeners
│   │   ├── Jobs/                   # Queued jobs
│   │   ├── Mail/                   # Mailable classes
│   │   ├── Providers/
│   │   │   ├── AppServiceProvider.ts          # Root provider — cascades to all others
│   │   │   ├── ConfigServiceProvider.ts       # Loads src/config/* and overrides package defaults
│   │   │   ├── MiddlewareServiceProvider.ts   # Registers aliases, groups, priority
│   │   │   ├── RouteServiceProvider.ts        # Boots route files
│   │   │   ├── EventServiceProvider.ts
│   │   │   ├── BroadcastServiceProvider.ts
│   │   │   └── QueueServiceProvider.ts
│   │   └── Console/Commands/       # Custom artisan commands
│   ├── config/                     # App-level config overrides (see vendor:publish)
│   │   ├── app.config.ts
│   │   ├── db.config.ts
│   │   ├── mail.config.ts
│   │   ├── queue.config.ts
│   │   └── broadcasting.config.ts
│   └── database/
│       ├── migrations/             # Class-based migration files
│       └── seeders/                # Database seeders
├── .env
└── package.json
```

---

## Core Concepts

### Service Providers

Providers bootstrap your application. They run in order:
1. **`ConfigServiceProvider`** — loads `src/config/*` and calls `setConfig()` to override package defaults
2. **`MiddlewareServiceProvider`** — registers named aliases, groups, and priority
3. **`RouteServiceProvider`** — lazily boots route files (middleware aliases must be ready first)

```typescript
// src/app/Providers/AppServiceProvider.ts
import { ServiceProvider, ServiceProviderClass } from '@lara-node/core';
import { ConfigServiceProvider } from './ConfigServiceProvider';
import { MiddlewareServiceProvider } from './MiddlewareServiceProvider';
import { RouteServiceProvider } from './RouteServiceProvider';

export class AppServiceProvider extends ServiceProvider {
  protected additionalProviders: ServiceProviderClass[] = [
    ConfigServiceProvider,       // 1. configs first
    MiddlewareServiceProvider,   // 2. middleware aliases
    RouteServiceProvider,        // 3. routes last
  ];

  register(): void {
    this.registerProviders(this.additionalProviders);
    this.singleton(PaymentService);
  }
}
```

---

### Global Config System

Every `@lara-node/*` package registers its default config at import time via `setConfig()`. Your `ConfigServiceProvider` overrides those defaults with app-level values from `src/config/`.

```typescript
import { config, setConfig } from '@lara-node/core';

// Read with dot-notation (works anywhere after providers have run)
const driver  = config('mail.default');           // 'smtp'
const host    = config('mail.mailers.smtp.host'); // 'smtp.mailgun.org'
const appName = config('app.name', 'MyApp');      // fallback if unset

// Override a namespace (usually done inside a ServiceProvider)
setConfig('mail', { default: 'ses', mailers: { ... }, from: { ... } });
```

**`ConfigServiceProvider`** — generated automatically by `pnpm create lara-node`:

```typescript
// src/app/Providers/ConfigServiceProvider.ts
import { ServiceProvider, setConfig } from '@lara-node/core';
import appConfig    from '../../config/app.config';
import mailConfig   from '../../config/mail.config';
import queueConfig  from '../../config/queue.config';

export class ConfigServiceProvider extends ServiceProvider {
  register(): void {
    setConfig('app',   appConfig   as unknown as Record<string, unknown>);
    setConfig('mail',  mailConfig  as unknown as Record<string, unknown>);
    setConfig('queue', queueConfig as unknown as Record<string, unknown>);
  }
}
```

**Publish config templates** from installed packages into `src/config/`:

```bash
pnpm artisan vendor:publish --tag=config
```

This scans every `@lara-node/*` package for a `laraNode.publish` manifest and copies the matching template files. Use `--force` to overwrite existing files, `--list` to preview without copying, and `--provider mail` to target a single package.

---

### Middleware Service Provider

Register all named middleware in one place. This provider extends `MiddlewareServiceProvider` from `@lara-node/core`:

```typescript
// src/app/Providers/MiddlewareServiceProvider.ts
import { MiddlewareServiceProvider as BaseProvider } from '@lara-node/core';
import {
  AuthMiddleware,
  AuthorizeByStatusMiddleware,
  authorizeRoles,
  authorizePermissions,
} from '@lara-node/middlewares';

export class MiddlewareServiceProvider extends BaseProvider {
  protected registerMiddleware(): void {
    // Named aliases — use in routes as strings: 'auth', 'can:perm', 'role:admin'
    this.middlewareAliases({
      auth:          new AuthMiddleware({ userLoader: async (uid) => User.find(uid) }).toHandler(),
      'must-be-active': AuthorizeByStatusMiddleware,  // class — handle() called automatically
      can:           (...perms: string[]) => authorizePermissions(...perms),
      role:          (...roles: string[]) => authorizeRoles(...roles),
    });

    // Middleware groups
    this.middlewareGroup('web', []);
    this.middlewareGroup('api', [/* 'throttle:120,1' */]);

    // Execution priority when multiple aliases apply to the same route
    this.middlewarePriority(['auth', 'must-be-active', 'can', 'role']);
  }
}
```

Available registration helpers (all on `ServiceProvider`):

| Method | Description |
|--------|-------------|
| `middlewareAlias(name, entry)` | Register a single alias |
| `middlewareAliases(map)` | Register multiple aliases at once |
| `middlewareGroup(name, list)` | Define a named group |
| `appendMiddlewareToGroup(group, mw)` | Add to the end of a group |
| `prependMiddlewareToGroup(group, mw)` | Add to the front of a group |
| `removeMiddlewareFromGroup(group, mw)` | Remove from a group |
| `middlewarePriority(list)` | Set execution priority order |
| `singletonMiddleware(mw)` | Instantiate a class only once |

---

### HTTP Kernel

The Kernel defines the **global middleware pipeline** — every request passes through these before hitting a route. Named aliases and groups live in `MiddlewareServiceProvider`, not here.

```typescript
// src/app/Http/Kernel.ts
import { HttpKernel as BaseKernel, middlewareStack } from '@lara-node/router';
import type { Middleware } from '@lara-node/core';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import {
  AsyncContextMiddleware,
  RequestLoggerMiddleware,
  ValidatorMiddleware,
  ResponseExtenderMiddleware,
  ErrorHandlerMiddleware,
} from '@lara-node/middlewares';

export class Kernel extends BaseKernel {
  // Pass classes directly — the stack calls handle() automatically
  protected override middleware: RequestHandler[] = middlewareStack.resolveMiddlewareStack([
    AsyncContextMiddleware,
    RequestLoggerMiddleware,
    ValidatorMiddleware,
    ResponseExtenderMiddleware,
  ] as Middleware[]);

  readonly errorHandler: ErrorRequestHandler = (err, req, res, next) =>
    new ErrorHandlerMiddleware().handle(err, req, res, next);
}
```

---

### Routing

Routes are defined with a fluent `RouterBuilder`. Use string aliases registered in `MiddlewareServiceProvider`:

```typescript
// src/routes/api.ts
import RouterBuilder from '@lara-node/router';
import { AuthController }  from '@app/Http/Controllers/User/AuthController';
import { PostController }  from '@app/Http/Controllers/PostController';

const { group, prefix } = new RouterBuilder();

// Public routes
group('/auth', (g) => {
  g.post('/register', [AuthController, 'register']);
  g.post('/login',    [AuthController, 'login']);
});

// Protected routes — 'auth' alias resolved from MiddlewareServiceProvider
group('/posts', (g) => {
  g.get('/',        'auth',              [PostController, 'index']);
  g.post('/',       'auth',              [PostController, 'store']);
  g.get('/:id',     'auth',              [PostController, 'show']);
  g.put('/:id',     'auth', 'can:edit_post', [PostController, 'update']);
  g.delete('/:id',  'auth', 'role:admin',    [PostController, 'destroy']);
});
```

Mount in `RouteServiceProvider.boot()`:

```typescript
async boot(): Promise<void> {
  const { apiRouter } = await import('../../routes/api');
  this.app.mountRoutes('/api', apiRouter.build());
}
```

---

### Models

Models extend the `Model` base class. Define your collection/table name, fillable fields, and relationships.

```typescript
import { Model, HasMany, SoftDeletes, Timestamps, applyTraits } from '@lara-node/db';
import type { Post } from './Post';

@applyTraits(Timestamps, SoftDeletes)
export class User extends Model {
  static collectionName = 'users';
  static fillable = ['name', 'email', 'password'];
  static hidden   = ['password'];

  posts(): HasMany<Post> {
    return this.hasMany('Post', 'user_id');
  }
}
```

**Querying:**

```typescript
const user   = await User.find(id);
const admins = await User.where('role', 'admin').orderBy('name').limit(10).get();
const post   = await Post.create({ title: 'Hello', user_id: user.id });

await post.update({ title: 'Updated' });
await post.delete();        // soft-delete if SoftDeletes trait applied
await post.forceDelete();   // hard delete
```

**Relationships:**

```typescript
const user  = await User.find(1);
const posts = await user.posts().get();
await user.posts().create({ title: 'My Post' });
```

---

### Events

Dispatch events synchronously or queue them for background processing.

```typescript
// src/app/Events/PostCreated.ts
import { Event } from '@lara-node/events';

export class PostCreated extends Event {
  constructor(public post: Record<string, unknown>) { super(); }
}
```

```typescript
// src/app/Listeners/NotifyFollowers.ts
import { Listener, ListensTo } from '@lara-node/events';
import type { PostCreated } from '../Events/PostCreated';

@ListensTo(PostCreated)
export class NotifyFollowers extends Listener<PostCreated> {
  async handle(event: PostCreated): Promise<void> {
    // send notification
  }
}
```

Dispatch from anywhere:

```typescript
import { event } from '@lara-node/events';
await event(new PostCreated(post));
```

---

### Queue

Define a job class, dispatch it, and run a worker.

```typescript
// src/app/Jobs/SendWelcomeEmail.ts
import { Job } from '@lara-node/queue';

export class SendWelcomeEmail extends Job {
  constructor(public userId: string) { super(); }

  async handle(): Promise<void> {
    // send the email
  }
}
```

```typescript
import { dispatch } from '@lara-node/queue';

// Fire and forget
await dispatch(new SendWelcomeEmail(user.id));

// With delay and queue name
await dispatch(new SendWelcomeEmail(user.id))
  .delay(60)
  .onQueue('notifications')
  .dispatch();
```

```bash
pnpm artisan queue:work
pnpm artisan queue:work --connection redis --queue high,default
```

---

### Scheduler

Define scheduled tasks in your `QueueServiceProvider.boot()`:

```typescript
import { scheduler } from '@lara-node/queue';

scheduler.call(() => cleanupExpiredSessions(), '0 2 * * *')
         .description('Clean expired sessions')
         .timezone('UTC');

scheduler.command('cache:clear').everyHour();
```

```bash
pnpm artisan schedule:work   # long-running daemon
pnpm artisan schedule:run    # run due tasks once (for crontab)
pnpm artisan schedule:list   # show upcoming tasks
```

---

### Mail

```typescript
// src/app/Mail/WelcomeMail.ts
import { Mailable } from '@lara-node/mail';

export class WelcomeMail extends Mailable {
  constructor(private name: string) { super(); }

  build() {
    return this.subject('Welcome!')
               .html(`<h1>Hi ${this.name}, welcome!</h1>`);
  }
}
```

```typescript
import { Mail } from '@lara-node/mail';

// Send immediately
await Mail().mailer().to('user@example.com').send(new WelcomeMail(user.name));

// Queue for background delivery
await Mail().mailer().to('user@example.com').queue(new WelcomeMail(user.name));

// Send with delay (seconds)
await Mail().mailer().to('user@example.com').later(new WelcomeMail(user.name), 300);
```

Mail config is driven by `src/config/mail.config.ts` (publish with `vendor:publish --tag=config`). The `config('mail.default')` accessor is used internally, so runtime overrides work without rebuilding.

---

### Cache

```typescript
import { Cache } from '@lara-node/cache';

await Cache.put('user:1', userData, 300);              // 300s TTL
const user = await Cache.get('user:1');
await Cache.forget('user:1');
await Cache.remember('user:1', 300, () => User.find(1)); // get or compute
await Cache.has('user:1');
```

Driver is read from `config('cache.driver')` (set in `src/config/app.config.ts`).

---

## Configuration

All configuration is environment-driven via `.env`. Config files in `src/config/` map env vars to typed objects and register them with the global `config()` system via `ConfigServiceProvider`.

```env
APP_NAME=my-api
APP_ENV=local
APP_KEY=base64:...          # pnpm artisan key:generate --write
APP_DEBUG=true
PORT=3000

# Database
DB_CONNECTION=mongodb        # mongodb | mysql
DB_HOST=127.0.0.1
DB_PORT=27017
DB_NAME=my_api
DB_USER=root
DB_PASSWORD=

# Cache
CACHE_DRIVER=file            # file | memory | redis | db

# Queue
QUEUE_CONNECTION=sync        # sync | database | redis

# Mail
MAIL_MAILER=smtp             # smtp | log | array
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=hello@example.com
MAIL_FROM_NAME=my-api

# Broadcasting
BROADCAST_DRIVER=websocket   # websocket | redis | log | null

# JWT
JWT_SECRET=change-me

# Telescope (optional)
TELESCOPE_ENABLED=true
TELESCOPE_TOKEN=secret        # protect /telescope in production

# Horizon (optional)
HORIZON_ENABLED=true
HORIZON_TOKEN=secret
```

**Reading config in code:**

```typescript
import { config } from '@lara-node/core';

config('app.name')               // → 'my-api'
config('mail.default')           // → 'smtp'
config('queue.connections.redis.driver') // → 'redis'
config('nonexistent', 'fallback')        // → 'fallback'
```

---

## Artisan CLI

### Server

```bash
pnpm artisan serve                  # start server, auto-selects next port if busy
pnpm artisan serve --port 8080      # explicit port
pnpm artisan serve --host 0.0.0.0   # bind to all interfaces
```

If the requested port is already in use, artisan automatically tries the next port sequentially (3000 → 3001 → 3002 …) and prints which port it started on.

### Keys

```bash
pnpm artisan key:generate           # print a new APP_KEY
pnpm artisan key:generate --write   # write it to .env
```

### Database

```bash
pnpm artisan migrate                # run pending migrations
pnpm artisan migrate:fresh          # drop all + re-migrate
pnpm artisan migrate:rollback       # roll back last batch
pnpm artisan migrate:status         # show migration state
pnpm artisan db:seed                # run database seeders
pnpm artisan db:wipe                # drop all tables/collections
pnpm artisan make:migration create_orders_table
pnpm artisan make:seeder OrderSeeder
```

### Vendor Publish

```bash
pnpm artisan vendor:publish                    # publish all tags from all packages
pnpm artisan vendor:publish --tag=config       # only config files
pnpm artisan vendor:publish --provider=mail    # only from @lara-node/mail
pnpm artisan vendor:publish --force            # overwrite existing files
pnpm artisan vendor:publish --list             # preview without copying
```

After running `--tag=config`, edit the files in `src/config/` to customize behaviour. `ConfigServiceProvider` picks them up automatically on next boot.

### Queue

```bash
pnpm artisan queue:work
pnpm artisan queue:work --connection redis --queue high,default
pnpm artisan queue:listen
pnpm artisan queue:status
pnpm artisan queue:failed
pnpm artisan queue:retry <id>
pnpm artisan queue:flush         # clear the failed jobs table
pnpm artisan queue:clear         # clear pending jobs
```

### Scheduler

```bash
pnpm artisan schedule:work       # long-running daemon
pnpm artisan schedule:run        # run due tasks once (crontab mode)
pnpm artisan schedule:list       # list scheduled tasks
```

### Cache

```bash
pnpm artisan cache:clear
pnpm artisan cache:get <key>
pnpm artisan cache:set <key> <value>
pnpm artisan cache:forget <key>
pnpm artisan cache:has <key>
pnpm artisan cache:list
pnpm artisan cache:driver
```

### Events

```bash
pnpm artisan event:list
pnpm artisan event:dispatch user.registered --payload '{"id":1}'
pnpm artisan event:clear
pnpm artisan make:event   OrderPlaced
pnpm artisan make:listener SendOrderConfirmation --event OrderPlaced
pnpm artisan make:subscriber OrderSubscriber
```

### Broadcasting

```bash
pnpm artisan broadcast:channels
pnpm artisan broadcast:connections
pnpm artisan broadcast:send <event> <channels>
pnpm artisan broadcast:terminate <connection-id>
```

### Horizon

```bash
pnpm artisan horizon:work
pnpm artisan horizon:status
pnpm artisan horizon:pause
pnpm artisan horizon:continue
pnpm artisan horizon:terminate
pnpm artisan horizon:list
```

### Docs

```bash
pnpm artisan docs:generate     # write openapi.json
pnpm artisan docs:routes       # list documented routes
```

### Custom Commands

```typescript
// src/app/Console/Commands/GreetCommand.ts
import { Command } from '@lara-node/console';
import type { ArgumentsCamelCase } from 'yargs';

export class GreetCommand extends Command {
  protected signature   = 'greet <name>';
  protected description = 'Greet a user by name';

  protected options = {
    shout: { type: 'boolean' as const, alias: 's', default: false, description: 'UPPERCASE output' },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const greeting = `Hello, ${args.name}!`;
    this.success(this.option<boolean>('shout') ? greeting.toUpperCase() : greeting);
  }
}
```

Register by adding it to your artisan kernel or `AppServiceProvider`:

```typescript
this.singleton(GreetCommand);
```

Available output helpers: `this.info()`, `this.success()`, `this.warn()`, `this.error()`, `this.line()`, `this.comment()`, `this.newLine()`.

---

## Telescope

Request, query, job, log, cache, and exception watcher with a live dashboard.

```bash
# Dashboard at http://localhost:3000/telescope
```

Enable in `AppServiceProvider.additionalProviders`:

```typescript
import { TelescopeServiceProvider } from '@lara-node/telescope';

protected additionalProviders: ServiceProviderClass[] = [
  // ...
  TelescopeServiceProvider,
];
```

Publish the config template to customise watchers:

```bash
pnpm artisan vendor:publish --tag=config --provider=telescope
```

---

## Horizon

Queue supervisor with auto-scaling and a metrics dashboard.

```bash
pnpm artisan horizon:work

# Dashboard at http://localhost:3000/horizon
```

Enable via `additionalProviders`:

```typescript
import { HorizonServiceProvider } from '@lara-node/horizon';

protected additionalProviders: ServiceProviderClass[] = [
  // ...
  HorizonServiceProvider,
];
```

Publish and edit the config:

```bash
pnpm artisan vendor:publish --tag=config --provider=horizon
```

```typescript
// src/config/horizon.config.ts (after vendor:publish)
export default {
  enabled: true,
  path: '/horizon',
  environments: {
    production: {
      supervisor: [
        { name: 'default', queue: 'default', processes: 3, tries: 3, memory: 128, timeout: 60 },
        { name: 'high',    queue: 'high',    processes: 5, tries: 3, memory: 256, timeout: 30 },
      ],
    },
  },
};
```

---

## Singleton Registry (internals)

The middleware registry and `MiddlewareStack` are stored on `globalThis` so they survive when multiple semver-compatible versions of `@lara-node/core` are loaded in the same process. This means registrations made in one module instance are always visible to resolution calls in another — no "Unknown middleware" errors from version drift.

```
globalThis.__lara_node_middleware_registry__   // alias map
globalThis.__lara_node_middleware_stack__       // MiddlewareStack singleton
```

---

## Development

```bash
# Clone the monorepo
git clone https://github.com/venomous-maker/vest.git
cd vest

pnpm install
pnpm -r build       # build all packages
pnpm -r test        # run all tests
pnpm -r typecheck   # typecheck everything

# Publish a package (workspace:^ ensures correct semver ranges)
cd packages/core
pnpm publish --no-git-checks
```

All packages use `workspace:^` for cross-package dependencies so published versions carry compatible semver ranges (`^x.y.z`) rather than exact pins. This guarantees a single shared instance of `@lara-node/core` in every consumer project.

---

## License

MIT
