# Getting Started

This guide will help you create your first LaraNode application from scratch.

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (recommended) or npm/yarn
- **TypeScript** >= 5.0.0

## Quick Start

The fastest way to get started is using the `create-laranode` scaffolding tool:

```bash
pnpm create laranode my-app
cd my-app
pnpm install
```

This creates a complete LaraNode application with:

- Configured TypeScript project
- Service providers and bootstrapping
- Sample models, controllers, and services
- Environment configuration
- Migration and seeder setup

## Manual Setup

If you prefer to set up manually:

### 1. Initialize Project

```bash
mkdir my-app && cd my-app
pnpm init
```

### 2. Install Core Dependencies

```bash
pnpm add @lara-node/core @lara-node/router @lara-node/db express reflect-metadata
pnpm add -D typescript @types/node @types/express
```

### 3. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Create Application Bootstrap

Create `src/bootstrap/app.ts`:

```typescript
import { Application, Container } from '@lara-node/core'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider'
import { RouteServiceProvider } from '../app/Providers/RouteServiceProvider'

const container = new Container()
const app = new Application(container)

app.register(AppServiceProvider)
app.register(RouteServiceProvider)

export { app }
```

### 5. Create Service Provider

Create `src/app/Providers/AppServiceProvider.ts`:

```typescript
import { ServiceProvider } from '@lara-node/core'

export class AppServiceProvider extends ServiceProvider {
  register() {
    // Register bindings
  }

  boot() {
    // Boot services
  }
}
```

### 6. Create Server Entry

Create `src/server.ts`:

```typescript
import { app } from './bootstrap/app'
import 'reflect-metadata'

async function bootstrap() {
  await app.boot()
  await app.listen(3000)
  console.log('Server running on http://localhost:3000')
}

bootstrap()
```

### 7. Start Development

```bash
pnpm add -D tsx
pnpm exec tsx src/server.ts
```

## Using the CLI

LaraNode includes an Artisan-style CLI for common tasks:

```bash
# Start development server
pnpm exec artisan serve

# List routes
pnpm exec artisan route:list

# Run migrations
pnpm exec artisan migrate

# Clear cache
pnpm exec artisan cache:clear
```

## Next Steps

- [Installation](/guide/installation) -- Detailed installation guide
- [Project Structure](/guide/project-structure) -- Understand the directory layout
- [Configuration](/guide/configuration) -- Configure your application
