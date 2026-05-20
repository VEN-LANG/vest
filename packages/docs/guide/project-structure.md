# Project Structure

A typical LaraNode application follows a Laravel-inspired directory structure.

## Default Structure

When you create a new project with `create-vest`, you get:

```
my-app/
├── src/
│   ├── app/
│   │   ├── Events/          # Event classes
│   │   ├── Http/
│   │   │   ├── Controllers/ # HTTP controllers
│   │   │   └── Kernel.ts    # HTTP kernel
│   │   ├── Jobs/            # Queue job classes
│   │   ├── Listeners/       # Event listeners
│   │   ├── Mail/            # Mailable classes
│   │   ├── Middleware/      # Custom middleware
│   │   ├── Models/          # Database models
│   │   ├── Observers/       # Model observers
│   │   ├── Providers/       # Service providers
│   │   └── Services/        # Business logic services
│   ├── bootstrap/
│   │   └── app.ts           # Application bootstrap
│   ├── config/              # Configuration files
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── cache.config.ts
│   │   ├── queue.config.ts
│   │   ├── mail.config.ts
│   │   └── horizon.config.ts
│   ├── database/
│   │   ├── migrations/      # Database migrations
│   │   └── seeders/         # Database seeders
│   ├── routes/
│   │   └── api.ts           # Route definitions
│   ├── artisan.ts           # CLI entry point
│   └── server.ts            # HTTP server entry point
├── .env                     # Environment variables
├── .env.example             # Example environment file
├── package.json
└── tsconfig.json
```

## Directory Descriptions

### `src/app/`

Contains your application's business logic:

| Directory           | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `Events/`           | Event classes that can be dispatched      |
| `Http/Controllers/` | HTTP controllers handling requests        |
| `Http/Kernel.ts`    | HTTP kernel with middleware configuration |
| `Jobs/`             | Queueable job classes                     |
| `Listeners/`        | Event listener classes                    |
| `Mail/`             | Mailable email classes                    |
| `Middleware/`       | Custom HTTP middleware                    |
| `Models/`           | Database model classes                    |
| `Observers/`        | Model observer classes                    |
| `Providers/`        | Service provider classes                  |
| `Services/`         | Business logic service classes            |

### `src/bootstrap/`

Application bootstrapping:

- `app.ts` -- Creates the Application instance, registers service providers

### `src/config/`

Configuration files for each package:

- `app.config.ts` -- Application settings
- `database.config.ts` -- Database connection settings
- `cache.config.ts` -- Cache driver configuration
- `queue.config.ts` -- Queue connection settings
- `mail.config.ts` -- Mail driver settings
- `horizon.config.ts` -- Horizon queue monitoring

### `src/database/`

Database migrations and seeders:

- `migrations/` -- Timestamp-prefixed migration files
- `seeders/` -- Database seeder classes

### `src/routes/`

Route definitions:

- `api.ts` -- API route definitions
- `web.ts` -- Web route definitions (if applicable)

### Entry Points

- `src/server.ts` -- HTTP server entry point
- `src/artisan.ts` -- CLI entry point

## Entry Point Files

### server.ts

```typescript
import { app } from "./bootstrap/app";
import "reflect-metadata";

async function bootstrap() {
  await app.boot();
  await app.listen(3000);
  console.log("Server running on http://localhost:3000");
}

bootstrap();
```

### artisan.ts

```typescript
import { Kernel } from "@lara-node/console";
import "reflect-metadata";

const kernel = new Kernel();
kernel.handle(process.argv);
```

## Customizing Structure

You can customize the structure by modifying your service providers. The framework is flexible and doesn't enforce a strict directory layout.

## Next Steps

- [Configuration](/guide/configuration) -- Configure your application
- [Service Providers](/guide/service-providers) -- Learn about service providers
- [Core Package](/packages/core) -- Deep dive into the core
