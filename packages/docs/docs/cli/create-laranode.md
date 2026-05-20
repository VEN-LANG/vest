# Create LaraNode

`create-vest` is the official scaffolding tool for creating new LaraNode applications.

## Usage

```bash
pnpm create vest my-app
cd my-app
pnpm install
```

## Interactive Prompts

The CLI will ask:

- **Project name** -- Your application name
- **Database driver** -- MySQL or MongoDB
- **Optional packages** -- Select additional packages

## Generated Structure

```
my-app/
├── src/
│   ├── app/
│   │   ├── Events/
│   │   ├── Http/Controllers/
│   │   ├── Jobs/
│   │   ├── Listeners/
│   │   ├── Mail/
│   │   ├── Middleware/
│   │   ├── Models/
│   │   ├── Observers/
│   │   ├── Providers/
│   │   └── Services/
│   ├── bootstrap/app.ts
│   ├── config/
│   ├── database/migrations/
│   ├── database/seeders/
│   ├── routes/
│   ├── artisan.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Generated Code

Includes sample:

- **Models** -- User, Role, Permission with relationships
- **Controllers** -- Auth, User, Role with @Doc decorators
- **Services** -- Business logic services
- **Middleware** -- ThrottleMiddleware with @Middleware decorator
- **Observers** -- UserObserver with @Observe decorator
- **Providers** -- AppServiceProvider, RouteServiceProvider

## Package Namespace

Uses `@lara-node/*` package namespace:

```json
{
  "dependencies": {
    "@lara-node/core": "latest",
    "@lara-node/db": "latest",
    "@lara-node/router": "latest"
  }
}
```

## Next Steps

- [Getting Started](/guide/getting-started) -- Quick start
- [Project Structure](/guide/project-structure) -- Directory layout
