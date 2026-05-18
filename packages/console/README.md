# @lara-node/console

Artisan CLI — command runner, custom command base class, and cron scheduler for Lara-Node apps.

## Installation

```sh
pnpm add @lara-node/console
```

The `artisan` binary is available at `node_modules/.bin/artisan` after installation.

## Quick Start

```sh
# Start the dev server
node artisan serve

# Generate an application key
node artisan key:generate

# Run database migrations
node artisan migrate
```

## Built-in Commands

### Server

```sh
node artisan serve [--port=3000] [--host=localhost]
```

### Key management

```sh
node artisan key:generate   # writes APP_KEY to .env
```

### Migrations

```sh
node artisan migrate               # run all pending migrations
node artisan migrate:fresh         # drop all tables then re-run all migrations
node artisan migrate:rollback      # roll back the most recent migration batch
```

### Cache

```sh
node artisan cache:clear              # clear all cached values
node artisan cache:list               # list all cache keys
node artisan cache:get <key>          # retrieve a value by key
node artisan cache:set <key> <value>  # store a value
node artisan cache:forget <key>       # delete a key
node artisan cache:has <key>          # check key existence (exit 0 = exists)
node artisan cache:driver             # show the active cache driver
```

### Queue

```sh
node artisan queue:work [--connection=redis] [--queue=default] [--tries=3] [--timeout=60]
node artisan queue:failed          # list failed jobs
node artisan queue:retry <id>      # retry a specific failed job
node artisan queue:flush           # delete all failed jobs
```

### Routes

```sh
node artisan route:list   # print a table of all registered routes
```

### Events

```sh
node artisan event:list   # list all registered events and their listeners
```

### Horizon

```sh
node artisan horizon:start   # start Horizon supervisor
node artisan horizon:pause   # pause all workers
node artisan horizon:resume  # resume all workers
node artisan horizon:status  # show worker status
```

### Documentation

```sh
node artisan docs:generate   # write openapi.json to the project root
```

### Publishing

```sh
node artisan vendor:publish   # copy package config stubs to config/
```

### Broadcasting

```sh
node artisan broadcast:channels   # list all registered broadcast channels
```

### Scheduler

```sh
node artisan schedule:run   # execute all due scheduled tasks immediately
```

## Custom Commands

Extend the `Command` base class, set `signature` and `description`, and implement `handle()`.

```ts
// src/Console/GreetCommand.ts
import { Command } from '@lara-node/console';

export class GreetCommand extends Command {
  signature = 'greet {name} {--caps : Print name in uppercase}';
  description = 'Greet a user by name';

  async handle(): Promise<void> {
    const name = this.argument('name') as string;
    const caps  = this.option('caps') as boolean;
    this.info(`Hello, ${caps ? name.toUpperCase() : name}!`);
  }
}
```

### Argument / option helpers

```ts
this.argument('name')          // positional argument value
this.option('caps')            // boolean flag value
this.option('port')            // option with value (--port=8080)

this.info('message')           // green output
this.error('message')          // red output (also to stderr)
this.warn('message')           // yellow output
this.line('message')           // plain output
this.comment('message')        // dim comment line
this.newLine()                 // blank line

const answer = await this.ask('What is your name?');
const secret = await this.secret('Enter password:');
const confirmed = await this.confirm('Are you sure?');
const choice = await this.choice('Pick a driver', ['file', 'redis', 'database']);
```

### Registering commands

```ts
// src/Console/Kernel.ts
import { Kernel } from '@lara-node/console';
import { GreetCommand } from './GreetCommand';

export class AppKernel extends Kernel {
  protected commands = [GreetCommand];
}
```

Then point the `artisan` entrypoint at your kernel:

```ts
// artisan.ts
import { AppKernel } from './src/Console/Kernel';
AppKernel.handle();
```

## Cron Scheduler

Override `schedule()` in your `Kernel` subclass to register recurring tasks.

```ts
import { Kernel } from '@lara-node/console';

export class AppKernel extends Kernel {
  protected schedule(): void {
    // Run a closure
    this._scheduler
      .call(() => console.log('Every minute'))
      .everyMinute();

    // Run a command
    this._scheduler
      .command('cache:clear')
      .daily()
      .withoutOverlapping()
      .onOneServer();

    // Custom cron expression
    this._scheduler
      .call(async () => {
        await sendWeeklyReport();
      })
      .cron('0 8 * * 1')  // 08:00 every Monday
      .timezone('UTC');
  }
}
```

Available frequency helpers: `.everyMinute()`, `.everyFiveMinutes()`, `.everyTenMinutes()`, `.everyFifteenMinutes()`, `.everyThirtyMinutes()`, `.hourly()`, `.daily()`, `.dailyAt('13:00')`, `.weekdays()`, `.weekends()`, `.weekly()`, `.monthly()`, `.cron(expr)`.

Run due tasks:

```sh
node artisan schedule:run
```

Set this up as a system cron to poll every minute:

```
* * * * * cd /var/www/my-api && node artisan schedule:run >> /dev/null 2>&1
```

## Environment Variables

| Variable | Default     | Description                          |
|----------|-------------|--------------------------------------|
| `PORT`   | `3000`      | Port used by the `serve` command     |
| `HOST`   | `localhost` | Host used by the `serve` command     |
