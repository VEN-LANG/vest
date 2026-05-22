# apps/example

A production-ready REST API built with [Lara-Node](https://github.com/venomous-maker/vest) — a Laravel-inspired Node.js framework.

## Stack

- **Runtime**: Node.js with TypeScript (via @swc-node/register — supports decorators + no .js extensions)
- **Framework**: Express 5 + @lara-node/core (IoC container, service providers)
- **Database**: MySQL (mysql2)
- **Auth**: JWT (@lara-node/auth + jsonwebtoken)
- **Validation**: @lara-node/validator (Laravel-style rules)
- **Middleware**: @lara-node/middlewares (class-based)
- **Packages**: @lara-node/validator, @lara-node/middlewares, @lara-node/events, @lara-node/queue, @lara-node/mail

## Quick Start

```bash
pnpm install
cp .env.example .env
# Edit .env with your database credentials

pnpm artisan migrate          # run all migrations
pnpm artisan db:seed          # seed roles, permissions, and users
pnpm dev                      # start dev server on http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot-reload |
| `pnpm build` | Compile to `dist/` |
| `pnpm start` | Run compiled output |
| `pnpm artisan <cmd>` | Run artisan CLI commands |
| `pnpm artisan migrate` | Run pending migrations |
| `pnpm artisan migrate:fresh` | Drop all tables and re-migrate |
| `pnpm artisan db:seed` | Run database seeders |
| `pnpm artisan permissions:sync` | Sync permissions to DB |
| `pnpm artisan permissions:list` | List all permissions |
| `pnpm typecheck` | TypeScript type check |
| `pnpm test` | Run tests with Vitest |

## Project Structure

```
src/
├── app/
│   ├── Console/Commands/       # Artisan commands
│   ├── Events/                 # Event classes
│   ├── Http/
│   │   ├── Controllers/        # Request handlers (IoC auto-wired)
│   │   │   ├── User/           # Auth, User, Role, Permission controllers
│   │   │   └── File/           # File upload controller
│   │   └── Kernel.ts           # Global + named middleware registration
│   ├── Jobs/                   # Queueable jobs
│   ├── Listeners/              # Event listeners (@ListensTo decorator)
│   ├── Mail/                   # Mailable classes
│   │   ├── WelcomeEmail.ts
│   │   ├── PasswordResetEmail.ts
│   │   ├── AccountVerificationEmail.ts
│   │   └── InvoiceEmail.ts
│   ├── Middleware/             # Custom middleware classes
│   ├── Models/                 # Eloquent-style ORM models
│   │   ├── User/               # User, Role, Permission, UserProfile
│   │   └── File/               # File model
│   ├── Observers/              # Model observers
│   ├── Providers/              # Service providers
│   │   ├── AppServiceProvider.ts
│   │   ├── ConfigServiceProvider.ts
│   │   ├── MiddlewareServiceProvider.ts
│   │   ├── RouteServiceProvider.ts
│   │   ├── EventServiceProvider.ts
│   │   ├── BroadcastServiceProvider.ts
│   │   └── QueueServiceProvider.ts
│   ├── Services/               # Business logic layer
│   └── Subscribers/            # Event subscribers
├── bootstrap/
│   └── app.ts                  # Application boot sequence
├── config/                     # App and DB configuration
├── database/
│   ├── migrations/             # Class-based migrations (001–007)
│   └── seeders/                # RolePermission, User, Database seeders
├── routes/
│   ├── api.ts                  # API routes (/api/*)
│   ├── web.ts                  # Web routes (/)
│   └── channels.ts             # Broadcasting channel auth
├── types/
│   └── express.d.ts            # Express type augmentations (req.user, req.validate, res.jsonAsync)
├── artisan.ts                  # CLI entry point
├── register.ts                 # reflect-metadata + dotenv bootstrap
└── server.ts                   # HTTP server entry point
```

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login + receive JWT |
| GET | `/api/auth/me` | ✓ | Get authenticated user |

### Users
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/users` | view_users | List users (paginated) |
| GET | `/api/users/:id` | view_users | Get user |
| POST | `/api/users` | create_users | Create user |
| PUT | `/api/users/:id` | update_users | Update user |
| DELETE | `/api/users/:id` | delete_users | Soft-delete user |
| PATCH | `/api/users/:id/status` | activate_and_deactivate_users | Toggle active/inactive |
| POST | `/api/users/:id/roles` | add_roles_to_users | Assign role |
| DELETE | `/api/users/:id/roles/:roleId` | remove_roles_from_users | Remove role |

### Roles & Permissions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/roles` | List roles |
| POST | `/api/roles` | Create role |
| POST | `/api/roles/:id/permissions` | Sync permissions to role |
| GET | `/api/permissions` | List permissions |

### Files
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/files` | Upload file (multipart/form-data, field: `file`) |
| GET | `/api/files/:id/download` | Download file |
| DELETE | `/api/files/:id` | Delete file |

## Default Credentials (after seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password | Admin (all permissions) |
| user@example.com | password | User |

## Validation

Use `req.validate()` in any controller action (attached by `ValidatorMiddleware`):

```typescript
const data = await req.validate({
  name: 'required|string|min:2|max:100',
  email: 'required|email|unique:users,email',
  age:   'required|integer|min:18|max:120',
  role:  'required|in:admin,user,moderator',
});
```

Available rules: `required`, `email`, `string`, `integer`, `numeric`, `boolean`, `array`, `min`, `max`, `between`, `in`, `not_in`, `unique:table,col`, `exists:table,col`, `regex`, `url`, `uuid`, `date`, `before`, `after`, `confirmed`, `nullable`, `sometimes`, and many more.

## Mail

```typescript
import { Mail } from '@lara-node/mail';
import { WelcomeEmail } from '@app/Mail/WelcomeEmail';
import { PasswordResetEmail } from '@app/Mail/PasswordResetEmail';

// Send immediately
await Mail.send(new WelcomeEmail(user.name, user.email));

// Send via queue (non-blocking)
await Mail.queue(new PasswordResetEmail(user.name, user.email, token));
```

Available mailables:
- `WelcomeEmail` — sent on registration
- `PasswordResetEmail` — password reset link
- `AccountVerificationEmail` — email verification
- `InvoiceEmail` — structured invoice with line items

## Jobs & Scheduler

```typescript
import { Queue } from '@lara-node/queue';
import { SendMailJob } from '@app/Jobs/SendMailJob';

// Dispatch a job
await Queue.push(new SendMailJob({ to: 'user@example.com', subject: 'Hello', body: 'World' }));

// Dispatch with delay (seconds)
await Queue.later(300, new SendMailJob({ ... }));
```

Scheduled jobs (configured in `QueueServiceProvider`):

| Job | Schedule |
|-----|----------|
| `permissions:sync` | Daily at 00:05 |
| `CleanupJob` | Daily at 02:00 |
| `GenerateReportJob` (weekly users) | Every Sunday midnight |
| `GenerateReportJob` (monthly activity) | 1st of month at 06:00 |

## Events

```typescript
import { getEventDispatcher } from '@lara-node/events';
import { UserRegistered } from '@app/Events/UserEvents';

const dispatcher = getEventDispatcher();
await dispatcher.dispatch(new UserRegistered(user.id, user.email, user.name));
```

## Custom Middleware

```typescript
// src/app/Middleware/ThrottleMiddleware.ts
export class ThrottleMiddleware {
  handle(req, res, next): void { /* ... */ }
  toHandler() { return (req, res, next) => this.handle(req, res, next); }
}

// Register in Http/Kernel.ts namedMiddleware:
throttle: (...args) => new ThrottleMiddleware(Number(args[0]) || 60).toHandler(),

// Use on routes:
g.post('/login', 'throttle:10', [AuthController, 'login']);
```

## Environment Variables

### App

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `local` | Application environment |
| `PORT` | `3000` | HTTP server port |
| `JWT_SECRET` | — | **Required in production** |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |

### Database — common

| Variable | Default | Description |
|---|---|---|
| `DB_CONNECTION` | `mysql` | Driver: `mysql` or `mongodb` |
| `DB_NAME` | `apps/example` | Database / schema name |
| `SKIP_DB` | — | Set to `1` to skip DB init in CI/test |

### Database — MySQL

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `127.0.0.1` | Host |
| `DB_PORT` | `3306` | Port |
| `DB_USER` | `root` | Username |
| `DB_PASSWORD` | _(empty)_ | Password |
| `DB_POOL_LIMIT` | `10` | Connection pool size |
| `DB_SOCKET_PATH` | — | Unix socket path (overrides host/port) |

### Mail / Queue / Broadcast

| Variable | Default | Description |
|---|---|---|
| `MAIL_DRIVER` | `log` | Mail driver (log, smtp) |
| `MAIL_FROM_ADDRESS` | — | From address |
| `QUEUE_CONNECTION` | `sync` | Queue driver |
| `BROADCAST_DRIVER` | `null` | Broadcasting driver |

## Decorator Support

This project uses `@swc-node/register` (not tsx/esbuild) to enable full decorator metadata:

- `@Injectable()` on services/controllers → IoC container auto-resolves constructor dependencies
- `@use(SoftDeletes, Timestamps)` on models → mixin traits
- `@ListensTo('event.name')` on listeners → auto-registered by EventServiceProvider
- `@Queueable({ queue: 'emails' })` on jobs → queue routing

No `.js` extensions needed in imports (`moduleResolution: "bundler"`).
