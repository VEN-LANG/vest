---
name: @lara-node/console — Artisan CLI & Commands
description: >-
  Laravel Artisan-style CLI with 40+ built-in commands and custom command creation.
  Interactive prompts, colored output, tables, and scheduler integration.
  Activates for questions about artisan CLI, Command class, Kernel, or creating custom commands.
---

# @lara-node/console

Laravel Artisan-style CLI with 40+ built-in commands.

## Key Exports

| Export | Description |
|--------|-------------|
| `Command` | Base command class |
| `Kernel` | Command kernel |

## Usage

```bash
pnpm exec artisan [command]
```

## Built-in Commands

- `serve` — Start development server
- `route:list` — List all registered routes
- `migrate` — Run database migrations
- `make:model` — Create a new model
- `make:controller` — Create a new controller
- `make:command` — Create a new command
- `cache:clear` — Clear application cache
- `queue:work` — Start queue worker
- `schedule:run` — Run scheduled tasks

## Custom Command

```typescript
import { Command } from "@lara-node/console";

class SendReports extends Command {
  signature = "reports:send {--type=} {user?}";
  description = "Send scheduled reports";

  async handle() {
    const type = this.option("type");
    const user = this.argument("user");
    this.info(`Sending ${type} reports...`);
  }
}
```
