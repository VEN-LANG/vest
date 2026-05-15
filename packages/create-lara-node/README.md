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

Uses `@swc-node/register` (not tsx) for full decorator metadata:

- `@Injectable()` → IoC auto-resolution (no manual wiring)
- `@use(SoftDeletes, Timestamps)` → model traits
- `@ListensTo('user.registered')` → auto-registered listeners
- `@Queueable({ queue: 'emails' })` → queue routing

No `.js` extensions required in imports (`moduleResolution: "bundler"`).

## Default Seeded Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password | Admin |
| user@example.com | password | User |

## License

MIT
