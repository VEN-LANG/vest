# Built-in Commands

LaraNode includes 40+ Artisan-style commands.

## Server

```bash
pnpm exec artisan serve          # Start HTTP server
```

## Migrations

```bash
pnpm exec artisan migrate        # Run migrations
pnpm exec artisan migrate:fresh  # Drop and re-run
pnpm exec artisan migrate:rollback # Rollback last batch
pnpm exec artisan migrate:status  # Show status
pnpm exec artisan make:migration  # Create migration
```

## Database

```bash
pnpm exec artisan db:seed        # Run seeders
pnpm exec artisan make:seeder    # Create seeder
pnpm exec artisan db:wipe        # Drop all tables
```

## Cache

```bash
pnpm exec artisan cache:clear    # Clear cache
pnpm exec artisan cache:forget   # Forget key
```

## Queue

```bash
pnpm exec artisan queue:work         # Start worker
pnpm exec artisan queue:restart      # Restart workers
pnpm exec artisan queue:flush-failed # Flush failed jobs
```

## Horizon

```bash
pnpm exec artisan horizon          # Start Horizon
pnpm exec artisan horizon:pause    # Pause workers
pnpm exec artisan horizon:resume   # Resume workers
pnpm exec artisan horizon:stop     # Stop Horizon
pnpm exec artisan horizon:status   # Show status
```

## Events

```bash
pnpm exec artisan event:cache      # Cache events
pnpm exec artisan event:clear      # Clear event cache
pnpm exec artisan make:event       # Create event
pnpm exec artisan make:listener    # Create listener
pnpm exec artisan make:subscriber  # Create subscriber
```

## Routes

```bash
pnpm exec artisan route:list       # List all routes
```

## Mail

```bash
pnpm exec artisan broadcast:auth   # Broadcast auth endpoint
```

## Utilities

```bash
pnpm exec artisan key:generate     # Generate APP_KEY
pnpm exec artisan vendor:publish   # Publish vendor files
pnpm exec artisan docs:generate    # Generate documentation
```

## Next Steps

- [Writing Commands](/packages/console/commands) -- Create commands
- [Console Overview](/packages/console) -- Overview
- [Scheduler](/packages/queue/scheduler) -- Task scheduler
