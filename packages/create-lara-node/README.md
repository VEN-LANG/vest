# create-lara-node

Scaffold a new [Lara-Node](https://github.com/venomous-maker/vest) application in seconds.

## Usage

```bash
pnpm create lara-node
# or
pnpm create lara-node my-api
# or
npx create-lara-node my-api
```

## What It Generates

The interactive CLI asks you:

1. **Project name** — used as the directory and package name
2. **Database driver** — MySQL or MongoDB
3. **Packages to include** — multiselect from:
   - `@lara-node/validator` (always included)
   - `@lara-node/middlewares` (always included)
   - `@lara-node/events` (events, listeners, subscribers, broadcasting)
   - `@lara-node/queue` (jobs, scheduler)
   - `@lara-node/mail` (mailables)
   - `@lara-node/horizon` (queue dashboard)
   - `@lara-node/telescope` (debug dashboard)

## Generated Project Structure

```
my-api/
├── src/
│   ├── app/
│   │   ├── Console/Commands/       # PermissionsSyncCommand, PermissionsListCommand
│   │   ├── Events/                 # UserRegistered, UserLoggedIn, UserNotification
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── User/           # AuthController, UserController, RoleController, PermissionController
│   │   │   │   └── File/           # FileController (multer upload)
│   │   │   └── Kernel.ts           # Global + named middleware (auth, must-be-active, can, role, throttle)
│   │   ├── Jobs/
│   │   │   ├── SendMailJob.ts      # Queued email job
│   │   │   ├── CleanupJob.ts       # Periodic cleanup job
│   │   │   └── GenerateReportJob.ts
│   │   ├── Listeners/              # SendWelcomeEmail, LogUserLogin
│   │   ├── Mail/
│   │   │   ├── WelcomeEmail.ts
│   │   │   ├── PasswordResetEmail.ts
│   │   │   ├── AccountVerificationEmail.ts
│   │   │   └── InvoiceEmail.ts
│   │   ├── Middleware/
│   │   │   └── ThrottleMiddleware.ts
│   │   ├── Models/
│   │   │   ├── User/               # User, Role, Permission, UserProfile, RolesUsers, PermissionsRoles
│   │   │   └── File/               # File
│   │   ├── Observers/
│   │   │   └── UserObserver.ts     # creating, created, updating, deleting hooks
│   │   ├── Providers/
│   │   │   ├── AppServiceProvider.ts    # IoC singleton registrations
│   │   │   ├── RouteServiceProvider.ts  # api / web / channels route mounting
│   │   │   ├── EventServiceProvider.ts  # auto-discovers listeners + subscribers
│   │   │   ├── BroadcastServiceProvider.ts
│   │   │   └── QueueServiceProvider.ts  # queue + scheduler setup
│   │   ├── Services/               # AuthService, UserService, RoleService, PermissionService, FileService
│   │   └── Subscribers/            # UserEventSubscriber
│   ├── bootstrap/
│   │   └── app.ts                  # Application + service provider boot
│   ├── config/                     # app.config.ts, db.config.ts
│   ├── database/
│   │   ├── migrations/             # 7 class-based migrations (users → files)
│   │   └── seeders/                # RolePermissionSeeder, UserSeeder, DatabaseSeeder
│   ├── routes/
│   │   ├── api.ts                  # Full CRUD: auth, users, roles, permissions, files
│   │   ├── web.ts                  # Health check route
│   │   └── channels.ts             # Broadcasting channel auth
│   ├── types/
│   │   └── express.d.ts            # req.user, req.validate, res.jsonAsync type augmentations
│   ├── artisan.ts                  # CLI entry point (yargs)
│   ├── register.ts                 # reflect-metadata + dotenv/config bootstrap
│   └── server.ts                   # HTTP server entry point
├── .env.example
├── .gitignore
├── .swcrc                          # SWC decorator metadata config
├── tsconfig.json                   # moduleResolution: bundler, emitDecoratorMetadata: true
├── vite.config.ts
└── README.md
```

## Getting Started

```bash
pnpm create lara-node my-api
cd my-api
pnpm install
cp .env.example .env
# Edit .env — set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET

pnpm artisan migrate        # create all tables
pnpm artisan db:seed        # seed admin + user accounts
pnpm dev                    # start on http://localhost:3000
```

## API Routes (generated)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login (returns JWT) |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/users` | view_users | List users |
| POST | `/api/users` | create_users | Create user |
| PUT | `/api/users/:id` | update_users | Update user |
| DELETE | `/api/users/:id` | delete_users | Delete user |
| GET | `/api/roles` | view_roles | List roles |
| POST | `/api/roles/:id/permissions` | add_permissions_to_roles | Sync permissions |
| POST | `/api/files` | upload_files | Upload file |

## Decorator Support

Uses `@swc-node/register` for full decorator metadata (`emitDecoratorMetadata: true`). No `.js` extensions required in imports (`moduleResolution: "bundler"`).

### IoC & Providers — `@lara-node/core`

| Decorator | Effect |
|-----------|--------|
| `@Injectable()` | Marks a class for auto IoC resolution — constructor deps injected automatically |
| `@Provider()` | Registers a ServiceProvider for `app.discoverProviders()` |

```typescript
import { ServiceProvider, Provider } from '@lara-node/core';

@Provider()
export class AppServiceProvider extends ServiceProvider {
  register() { this.singleton(AuthService); }
}
```

### Route-Model Binding & Controller Routing — `@lara-node/router`

| Decorator | Effect |
|-----------|--------|
| `@Bind(name?)` | Registers a Model for route-model binding — `:user` param auto-resolves to a loaded User instance |
| `@Middleware(alias)` | Registers an IMiddleware class under a named alias (e.g. `'auth'`) |
| `@Route(prefix, ...mw)` | Marks a controller class with a base route prefix (and optional class-level middleware) |
| `@Route.get(path, ...mw)` | Registers a `GET` route on a controller method |
| `@Route.post / .put / .patch / .delete` | Same for other HTTP verbs |

```typescript
import { Bind, Middleware, Route } from '@lara-node/router';

// Model — auto-resolves :user route params
@Bind()
export class User extends Model { ... }

// Middleware — self-registers as 'auth' alias
@Middleware('auth')
export class AuthMiddleware implements IMiddleware { ... }

// Controller — declarative routing
@Route('/api/users', 'auth')
export class UserController {
  @Route.get('/')                            // GET /api/users
  async index(req: Request, res: Response) { ... }

  @Route.get('/:user')                       // GET /api/users/:user (auto-bound)
  async show(req: Request, res: Response) { ... }

  @Route.post('/', 'can:create_users')       // POST /api/users
  async store(req: Request, res: Response) { ... }

  @Route.put('/:user', 'can:update_users')   // PUT /api/users/:user
  async update(req: Request, res: Response) { ... }

  @Route.delete('/:user', 'can:delete_users')
  async destroy(req: Request, res: Response) { ... }
}

// In RouteServiceProvider.boot():
const router = RouterBuilder.fromControllers();  // all @Route controllers
this.app.mountRoutes('/', router.build());
```

### Model Observers — `@lara-node/db`

| Decorator | Effect |
|-----------|--------|
| `@Observe(ModelClass)` | Auto-wires the decorated Observer to ModelClass — no `User.observe(UserObserver)` bootstrap call needed |

```typescript
import { Observer, Observe } from '@lara-node/db';
import { User } from '../Models/User';

@Observe(User)
export class UserObserver extends Observer<User> {
  created(user: User) { console.log('User created:', user.getAttribute('email')); }
  deleting(user: User) { console.log('User deleting:', user.getAttribute('id')); }
}
```

### Queue Jobs — `@lara-node/queue`

| Decorator / Method | Effect |
|-------------------|--------|
| `@Queueable(opts?)` | Registers the job and sets class-level `queue`, `tries`, `timeout`, `connection` defaults |
| `shouldQueue()` | Override to conditionally skip dispatch — return `false` to discard silently |

```typescript
import { Job, Queueable } from '@lara-node/queue';

@Queueable({ queue: 'reports', tries: 2, timeout: 300 })
export class GenerateReportJob extends Job {
  constructor(private config: ReportConfig) { super(); }

  // Conditionally skip dispatch
  shouldQueue(): boolean {
    return !this.config.skipQueue;
  }

  async handle(): Promise<void> { ... }
}

// Class-level defaults applied automatically — no boilerplate:
await GenerateReportJob.dispatch().dispatch();
// Override per-dispatch when needed:
await GenerateReportJob.dispatch().onQueue('priority').tries(5).dispatch();
```

### Events — `@lara-node/events`

| Decorator | Effect |
|-----------|--------|
| `@ListensTo(event)` | Registers listener for auto-discovery by EventServiceProvider |
| `@ShouldQueue(opts?)` | Marks listener to be processed on a queue |
| `@AfterCommit()` | Dispatches queued listener only after DB transaction commits |
| `@Subscriber()` | Marks class as event subscriber for auto-discovery |
| `@EventName(name)` | Sets custom event name on an Event class |

```typescript
import { ListensTo, ShouldQueue } from '@lara-node/events';

@ListensTo('user.registered')
@ShouldQueue({ queue: 'notifications', tries: 3 })
export class SendWelcomeEmail extends Listener<UserRegisteredPayload> {
  async handle(payload: UserRegisteredPayload): Promise<void> {
    await Mail.send(new WelcomeEmail(payload.email));
  }
}
```

### Model Traits — `@lara-node/db`

```typescript
import { use } from '@lara-node/db';
import { SoftDeletes, Timestamps, Sluggable, Searchable } from '@lara-node/db';

@use(SoftDeletes, Timestamps)
export class Post extends Model { ... }
```

## Default Seeded Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password | Admin |
| user@example.com | password | User |

## License

MIT
