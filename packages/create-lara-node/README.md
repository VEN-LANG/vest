# create-lara-node

Interactive project scaffolder — generates a fully-configured Lara-Node application in seconds.

## Usage

```sh
pnpm create lara-node
pnpm create lara-node my-api
npx create-lara-node my-api
```

## What the CLI asks

1. **Project name** — used as the directory and `package.json` name
2. **Database driver** — MySQL or MongoDB
3. **Packages to include** — multiselect from:
   - `@lara-node/events` — events, listeners, subscribers, broadcasting
   - `@lara-node/queue` — jobs and scheduler
   - `@lara-node/mail` — mailables
   - `@lara-node/horizon` — queue monitoring dashboard
   - `@lara-node/telescope` — debug dashboard
   - (validator, middlewares, auth, router, core, and db are always included)

## Generated project structure

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
│   │   │   └── Kernel.ts           # Global + named middleware (auth, can, role, throttle)
│   │   ├── Jobs/
│   │   │   ├── SendMailJob.ts
│   │   │   ├── CleanupJob.ts
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
│   │   │   └── UserObserver.ts
│   │   ├── Providers/
│   │   │   ├── AppServiceProvider.ts
│   │   │   ├── RouteServiceProvider.ts
│   │   │   ├── EventServiceProvider.ts
│   │   │   ├── BroadcastServiceProvider.ts
│   │   │   └── QueueServiceProvider.ts
│   │   ├── Services/               # AuthService, UserService, RoleService, PermissionService, FileService
│   │   └── Subscribers/            # UserEventSubscriber
│   ├── bootstrap/
│   │   └── app.ts                  # Application + provider boot
│   ├── config/                     # app.config.ts, db.config.ts
│   ├── database/
│   │   ├── migrations/             # 7 migrations (users → files)
│   │   └── seeders/                # RolePermissionSeeder, UserSeeder, DatabaseSeeder
│   ├── routes/
│   │   ├── api.ts                  # Full CRUD: auth, users, roles, permissions, files
│   │   ├── web.ts                  # Health check route
│   │   └── channels.ts             # Broadcasting channel auth
│   ├── types/
│   │   └── express.d.ts            # req.user, req.validate, res.jsonAsync type augmentations
│   ├── artisan.ts                  # CLI entry point
│   ├── register.ts                 # reflect-metadata + dotenv bootstrap
│   └── server.ts                   # HTTP server entry point
├── .env.example
├── .gitignore
├── .swcrc                          # SWC decorator metadata config
├── tsconfig.json
└── package.json
```

## After scaffolding

```sh
cd my-api
pnpm install
cp .env.example .env
# Edit .env — set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET

pnpm artisan migrate       # create all tables
pnpm artisan db:seed       # seed admin and user accounts
pnpm dev                   # start dev server on http://localhost:3000
```

Or with npm:

```sh
npx create-lara-node my-api
cd my-api
npm install
cp .env.example .env

node artisan key:generate
node artisan migrate
node artisan serve
```

## Generated API routes

| Method | Path                              | Auth              | Description            |
|--------|-----------------------------------|-------------------|------------------------|
| POST   | `/api/auth/register`              | —                 | Register               |
| POST   | `/api/auth/login`                 | —                 | Login (returns JWT)    |
| GET    | `/api/auth/me`                    | auth              | Authenticated user     |
| GET    | `/api/users`                      | view_users        | List users             |
| POST   | `/api/users`                      | create_users      | Create user            |
| PUT    | `/api/users/:id`                  | update_users      | Update user            |
| DELETE | `/api/users/:id`                  | delete_users      | Delete user            |
| GET    | `/api/roles`                      | view_roles        | List roles             |
| POST   | `/api/roles/:id/permissions`      | add_permissions_to_roles | Sync role permissions |
| POST   | `/api/files`                      | upload_files      | Upload file            |

## Default seeded accounts

| Email                  | Password   | Role  |
|------------------------|------------|-------|
| admin@example.com      | password   | Admin |
| user@example.com       | password   | User  |

## Decorator overview

The scaffold uses all Lara-Node decorators. Here is a summary of what each does:

### `@lara-node/core`

```ts
@Injectable()   // marks a class for automatic IoC constructor injection
@Provider()     // registers a ServiceProvider for app.discoverProviders()
```

### `@lara-node/router`

```ts
@Bind()                     // registers a Model for route-model binding
@Middleware('alias')        // registers a middleware class under a named alias
@Route('/prefix', 'auth')   // sets base path + middleware on a controller class
@Route.get('/path')         // registers a GET route on a controller method
@Route.post / .put / .patch / .delete
```

### `@lara-node/db`

```ts
@use(SoftDeletes, Timestamps)  // apply traits to a model
@Observe(ModelClass)           // auto-wires an observer to a model
```

### `@lara-node/queue`

```ts
@Queueable({ queue: 'emails', tries: 3 })  // register job + set defaults
```

### `@lara-node/events`

```ts
@ListensTo('user.registered')   // register as listener for auto-discovery
@ShouldQueue                    // process listener on a queue
@AfterCommit                    // dispatch only after DB transaction commits
@Subscriber                     // mark class as event subscriber
```

## `--expose-gc` flag

All generated `package.json` scripts include `--expose-gc`. This lets Node release connection pool and MongoDB client memory promptly, preventing heap bloat in long-running processes.

```json
{
  "scripts": {
    "dev":    "node --expose-gc -r @swc-node/register src/server.ts",
    "artisan": "node --expose-gc -r @swc-node/register src/artisan.ts"
  }
}
```

When running compiled output in production, include the flag manually:

```sh
node --expose-gc dist/server.js
node --expose-gc dist/artisan.js queue:work
```

## Notes

- The scaffolder itself has no required environment variables — all configuration is written into the generated project's `.env.example`.
- `tsconfig.json` is configured with `moduleResolution: "bundler"` and `emitDecoratorMetadata: true`. Do not change the moduleResolution setting — the ORM and router decorators depend on it.
- The scaffold uses `@swc-node/register` (via `.swcrc`) for TypeScript compilation with full decorator metadata support at runtime.
