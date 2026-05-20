# Writing Commands

Create custom Artisan-style commands.

## Creating a Command

Extend the `Command` class:

```typescript
import { Command } from '@lara-node/console'

class GreetCommand extends Command {
  signature = 'greet {name}'
  description = 'Greet someone'

  async handle(args: Record<string, any>) {
    const name = this.argument('name')
    this.info(`Hello, ${name}!`)
  }
}
```

## Command Properties

```typescript
class MyCommand extends Command {
  signature = 'my:command {arg1} {--option=}'
  description = 'Command description'
  arguments = ['arg1']
  options = ['--option']
}
```

## Output Methods

```typescript
this.info('Information message')
this.error('Error message')
this.warn('Warning message')
this.success('Success message')
this.fail('Failure message')
```

## Tables

```typescript
this.table(
  ['Name', 'Email', 'Role'],
  [
    ['John', 'john@example.com', 'Admin'],
    ['Jane', 'jane@example.com', 'User'],
  ]
)
```

## Interactive Input

```typescript
const name = await this.ask('What is your name?')
const confirmed = await this.confirm('Are you sure?')
const choice = await this.choice('Choose an option', ['A', 'B', 'C'])
```

## Next Steps

- [Built-in Commands](/packages/console/built-in) -- All commands
- [Console Overview](/packages/console) -- Overview
