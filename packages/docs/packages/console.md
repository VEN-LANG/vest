# Console Package

The `@lara-node/console` package provides a Laravel Artisan-style CLI with commands and scheduler.

## Installation

```bash
pnpm add @lara-node/console @lara-node/core
```

## Overview

Features include:

- **40+ built-in commands** for migrations, queues, cache, routes
- **Custom command** creation
- **Interactive prompts** for input
- **Colored output** with tables
- **Scheduler integration**

## The `artisan` Binary

```bash
pnpm exec artisan [command]
```

## Key Exports

| Export | Description |
|--------|-------------|
| `Command` | Base command class |
| `Kernel` | Command kernel |

## Next Steps

- [Writing Commands](/packages/console/commands) -- Create commands
- [Built-in Commands](/packages/console/built-in) -- All commands
