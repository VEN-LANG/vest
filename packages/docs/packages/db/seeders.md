# Seeders

Seeders populate your database with test data.

## Creating Seeders

```bash
pnpm exec artisan make:seeder UserSeeder
```

## Writing Seeders

```typescript
// database/seeders/UserSeeder.ts
import { DB } from '@lara-node/db'

export class UserSeeder {
  async run() {
    await DB.table('users').insert({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password',
    })
  }
}
```

## Using Model Factories

```typescript
import { User } from '../app/Models/User'

export class UserSeeder {
  async run() {
    await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password',
    })

    // Create multiple
    for (let i = 0; i < 10; i++) {
      await User.create({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        password: 'hashed_password',
      })
    }
  }
}
```

## Running Seeders

```bash
# Run all seeders
pnpm exec artisan db:seed

# Run specific seeder
pnpm exec artisan db:seed --class=UserSeeder
```

## Programmatic Seeding

```typescript
import { runSeeders } from '@lara-node/db'
import { UserSeeder } from './seeders/UserSeeder'

await runSeeders([UserSeeder])
```

## Database Seeder

Create a main seeder that calls others:

```typescript
// database/seeders/DatabaseSeeder.ts
import { UserSeeder } from './UserSeeder'
import { PostSeeder } from './PostSeeder'

export class DatabaseSeeder {
  async run() {
    await new UserSeeder().run()
    await new PostSeeder().run()
  }
}
```

## Wiping Database

```bash
pnpm exec artisan db:wipe
```

## Next Steps

- [Migrations](/packages/db/migrations) -- Database migrations
- [Models](/packages/db/models) -- Working with models
- [Console Commands](/packages/console/built-in) -- Database commands
