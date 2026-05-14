# Vest

A Laravel-inspired Node.js framework for building production-ready REST APIs — structured, expressive, and batteries-included.

```
pnpm create vest my-api
```

---

## Features

- **Expressive routing** — fluent route builder with named middleware, groups, and parameter constraints
- **Eloquent-style ORM** — models with relationships, traits (SoftDeletes, Timestamps, Cacheable…), and Mongo/MySQL support
- **Service container** — IoC container with auto-injection and service providers
- **Event system** — synchronous and queued events, listeners, subscribers, and WebSocket broadcasting
- **Job queue** — driver-based queue (sync, MongoDB, Redis) with retries, priorities, and failed-job tracking
- **Cron scheduler** — fluent task scheduling with distributed locking
- **Mail** — SMTP, Mailgun, log, and array drivers with Mailable classes
- **Artisan CLI** — 50+ built-in commands; add your own with a single class
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
pnpm create vest my-api
cd my-api
cp .env.example .env        # set DB_CONNECTION, DB_NAME, JWT_SECRET
pnpm install
pnpm artisan key:generate --write
pnpm artisan migrate
pnpm dev
```

Server starts at `http://localhost:3000`.  
API docs at `http://localhost:3000/docs`.

---

## Packages

| Package | Description |
|---------|-------------|
| `@vest/core` | IoC container, Application, ServiceProvider |
| `@vest/db` | ORM models, relationships, migrations, schema builder |
| `@vest/router` | Route builder, middleware stack, HTTP kernel, OpenAPI |
| `@vest/auth` | JWT auth, bcrypt helpers |
| `@vest/cache` | Cache drivers (file, Redis, DB, memory), rate limiter |
| `@vest/events` | Event dispatcher, listeners, subscribers, broadcasting |
| `@vest/queue` | Job queue, scheduler, workers |
| `@vest/mail` | Mailers, drivers (SMTP, Mailgun, log, array) |
| `@vest/console` | Artisan CLI kernel, 50+ commands |
| `@vest/horizon` | Queue supervisor + dashboard |
| `@vest/telescope` | Debug & observability dashboard |
| `@vest/create-vest` | Project scaffolding (`pnpm create vest`) |

---

## Project Structure

```
my-api/
├── src/
│   ├── server.ts               # HTTP entry point
│   ├── artisan.ts              # CLI entry point
│   ├── bootstrap/
│   │   └── app.ts              # Application bootstrap & provider registration
│   ├── routes/
│   │   ├── api.ts              # API routes
│   │   └── web.ts              # Web routes
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Kernel.ts       # Global middleware + named aliases
│   │   │   ├── Controllers/    # Route controllers
│   │   │   └── Middleware/     # Custom middleware
│   │   ├── Models/             # Eloquent models
│   │   ├── Events/             # Event classes
│   │   ├── Listeners/          # Event listeners
│   │   ├── Jobs/               # Queued jobs
│   │   ├── Mail/               # Mailable classes
│   │   ├── Providers/          # Service providers
│   │   └── Console/Commands/   # Custom artisan commands
│   ├── config/                 # App-level config files
│   └── database/
│       ├── migrations/         # Schema migration files
│       └── seeders/            # Database seeders
├── .env
└── package.json
```

---

## Core Concepts

### Service Providers

Service providers bootstrap your application. Register bindings in `register()`, and run boot logic in `boot()`.

```typescript
// src/app/Providers/AppServiceProvider.ts
import { ServiceProvider } from '@vest/core';
import { PaymentService } from '../Services/PaymentService.js';

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton(PaymentService, () => new PaymentService(process.env.STRIPE_KEY!));
  }

  async boot(): Promise<void> {
    // runs after all providers have registered
  }
}
```

Register providers in `src/bootstrap/app.ts`:

```typescript
app.register(DatabaseServiceProvider);
app.register(AppServiceProvider);
app.register(RouteServiceProvider);
```

---

### Routing

Routes are defined with a fluent `RouterBuilder`. Middleware aliases are registered in `app/Http/Kernel.ts`.

```typescript
// src/routes/api.ts
import RouterBuilder from '@vest/router';
import { PostController } from '@app/Http/Controllers/PostController.js';
import { UserController } from '@app/Http/Controllers/UserController.js';

export const apiRouter = new RouterBuilder();

apiRouter.prefix('/auth').group((r) => {
  r.post('/register', [UserController, 'register']);
  r.post('/login',    [UserController, 'login']);
});

apiRouter
  .prefix('/posts')
  .middleware(['auth'])
  .group((r) => {
    r.get('/',       [PostController, 'index']);
    r.post('/',      [PostController, 'store']);
    r.get('/:id',    [PostController, 'show']);
    r.put('/:id',    [PostController, 'update']);
    r.delete('/:id', [PostController, 'destroy']);
  });
```

Mount in `RouteServiceProvider.boot()`:

```typescript
async boot(): Promise<void> {
  const { apiRouter } = await import('../../routes/api.js');
  this.app.mountRoutes('/api', apiRouter.build());
}
```

---

### Models

Models extend the `Model` base class. Define your collection/table name, fillable fields, and relationships.

```typescript
import { Model, HasMany, SoftDeletes, Timestamps, applyTraits } from '@vest/db';
import type { Post } from './Post.js';

@applyTraits(Timestamps, SoftDeletes)
export class User extends Model {
  static collectionName = 'users';
  static fillable = ['name', 'email', 'password'];
  static hidden = ['password'];

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
await post.delete();                // soft-delete if trait applied
await post.forceDelete();           // hard delete
```

**Relationships:**

```typescript
const user  = await User.find(1);
const posts = await user.posts().get();
await user.posts().create({ title: 'My Post' });
```

---

### Events

Dispatch events synchronously or queue them.

```typescript
// src/app/Events/PostCreated.ts
import { Event } from '@vest/events';

export class PostCreated extends Event {
  constructor(public post: Record<string, any>) { super(); }
}
```

```typescript
// src/app/Listeners/NotifyFollowers.ts
import { Listener, ListensTo } from '@vest/events';
import type { PostCreated } from '../Events/PostCreated.js';

@ListensTo(PostCreated)
export class NotifyFollowers extends Listener<PostCreated> {
  async handle(event: PostCreated): Promise<void> {
    // send notification
  }
}
```

Dispatch from anywhere:

```typescript
import { event } from '@vest/events';

await event(new PostCreated(post));
```

---

### Queue

Define a job class, dispatch it, and run a worker.

```typescript
// src/app/Jobs/SendWelcomeEmail.ts
import { Job } from '@vest/queue';

export class SendWelcomeEmail extends Job {
  constructor(public userId: string) { super(); }

  async handle(): Promise<void> {
    // send the email
  }
}
```

```typescript
// dispatch
import { dispatch } from '@vest/queue';
await dispatch(new SendWelcomeEmail(user.id));
```

```bash
pnpm artisan queue:work
```

---

### Scheduler

Define scheduled tasks in your `QueueServiceProvider`:

```typescript
import { Scheduler } from '@vest/queue';

Scheduler.call(() => cleanupExpiredSessions(), '0 2 * * *')
         .description('Clean expired sessions')
         .timezone('UTC');

Scheduler.command('cache:clear').everyHour();
```

```bash
pnpm artisan schedule:work   # long-running scheduler daemon
pnpm artisan schedule:run    # run due tasks once (for cron tab)
```

---

### Mail

```typescript
// src/app/Mail/WelcomeMail.ts
import { Mailable } from '@vest/mail';

export class WelcomeMail extends Mailable {
  constructor(private name: string) { super(); }

  build() {
    return this.subject('Welcome to the app!')
               .html(`<h1>Hi ${this.name}, welcome!</h1>`);
  }
}
```

```typescript
import { Mail } from '@vest/mail';
await Mail.to('user@example.com').send(new WelcomeMail(user.name));
```

---

### Cache

```typescript
import { Cache } from '@vest/cache';

await Cache.put('user:1', userData, 300);    // 300 seconds TTL
const user = await Cache.get('user:1');
await Cache.forget('user:1');
await Cache.remember('user:1', 300, () => User.find(1));
```

---

### HTTP Kernel

Register global middleware and named aliases in `app/Http/Kernel.ts`:

```typescript
import { HttpKernel } from '@vest/router';
import { authMiddleware } from './Middleware/auth.js';

export class Kernel extends HttpKernel {
  protected override middleware = [
    asyncContextMiddleware,
    requestLoggerMiddleware,
  ];

  protected override routeMiddleware = {
    auth:  authMiddleware,
    can:   (...perms: string[]) => authorizePermissions(...perms),
    role:  (...roles: string[]) => authorizeRoles(...roles),
  };
}
```

---

### Artisan CLI

```bash
# Server
pnpm artisan serve
pnpm artisan serve --port 8080

# Keys
pnpm artisan key:generate --write

# Database
pnpm artisan migrate
pnpm artisan migrate:fresh
pnpm artisan migrate:rollback
pnpm artisan migrate:status
pnpm artisan db:seed

# Queue
pnpm artisan queue:work
pnpm artisan queue:work --connection redis --queue high,default
pnpm artisan queue:listen
pnpm artisan queue:status
pnpm artisan queue:failed
pnpm artisan queue:retry <id>

# Scheduler
pnpm artisan schedule:work
pnpm artisan schedule:list

# Cache
pnpm artisan cache:clear
pnpm artisan cache:get <key>

# Events
pnpm artisan event:list
pnpm artisan event:dispatch user.registered --payload '{"id":1}'

# Horizon
pnpm artisan horizon:work
pnpm artisan horizon:status
pnpm artisan horizon:pause
pnpm artisan horizon:continue

# Generators
pnpm artisan make:event   OrderPlaced
pnpm artisan make:listener SendOrderConfirmation --event OrderPlaced
pnpm artisan make:migration create_orders_table
pnpm artisan make:seeder OrderSeeder

# Docs
pnpm artisan docs:generate     # write openapi.json
pnpm artisan route:list

# Custom command
pnpm artisan <your-command>
```

**Custom commands:**

```typescript
// src/app/Console/Commands/GreetCommand.ts
import { Command } from '@vest/console';

export class GreetCommand extends Command {
  protected signature = 'greet <name>';
  protected description = 'Greet a user by name';

  async handle(args: any): Promise<void> {
    this.success(`Hello, ${args.name}!`);
  }
}
```

Register in your kernel:

```typescript
import { Kernel } from '@vest/console';
import { GreetCommand } from './app/Console/Commands/GreetCommand.js';

const kernel = new Kernel();
kernel.addCommand(GreetCommand);
```

---

## Configuration

All configuration is environment-driven via `.env`.

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

# Cache
CACHE_DRIVER=file            # file | memory | redis | db

# Queue
QUEUE_CONNECTION=sync        # sync | mongodb | redis

# Mail
MAIL_DRIVER=log              # log | array | smtp | mailgun

# JWT
JWT_SECRET=change-me

# Telescope (optional)
TELESCOPE_ENABLED=true
TELESCOPE_TOKEN=secret        # protect /telescope in production

# Horizon (optional)
HORIZON_ENABLED=true
HORIZON_TOKEN=secret
```

---

## Telescope

Request, query, job, log, cache, and exception watcher with a live dashboard.

```bash
# Access at http://localhost:3000/telescope
```

Enable in `bootstrap/app.ts`:

```typescript
import { TelescopeServiceProvider } from '@vest/telescope';
app.register(TelescopeServiceProvider);
```

---

## Horizon

Queue supervisor with auto-scaling and a metrics dashboard.

```bash
pnpm artisan horizon:work

# Access at http://localhost:3000/horizon
```

Configure in `config/horizon.ts`:

```typescript
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

## Development

```bash
# Clone the monorepo
git clone https://github.com/yourorg/vest.git
cd vest

pnpm install
pnpm build          # build all packages
pnpm test           # run all tests
pnpm typecheck      # typecheck everything

# Run the example app
cd apps/example
cp .env.example .env
pnpm artisan migrate
pnpm dev
```

---

## License

MIT
