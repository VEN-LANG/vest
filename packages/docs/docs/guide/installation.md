# Installation

This guide covers different ways to install and set up LaraNode in your project.

## Using Create LaraNode (Recommended)

The fastest way to start a new project:

```bash
pnpm create vest my-app
cd my-app
pnpm install
```

This scaffolds a complete application with all recommended packages.

## Installing Individual Packages

You can install LaraNode packages individually:

```bash
# Core (required)
pnpm add @lara-node/core

# Database
pnpm add @lara-node/db

# Routing
pnpm add @lara-node/router

# Authentication
pnpm add @lara-node/auth

# Validation
pnpm add @lara-node/validator

# Cache
pnpm add @lara-node/cache

# Queue
pnpm add @lara-node/queue

# Events
pnpm add @lara-node/events

# Mail
pnpm add @lara-node/mail

# Middlewares
pnpm add @lara-node/middlewares

# Date handling
pnpm add @lara-node/carbon

# Console CLI
pnpm add @lara-node/console

# Monitoring
pnpm add @lara-node/horizon @lara-node/telescope
```

## Peer Dependencies

Most LaraNode packages require `@lara-node/core` as a peer dependency. Make sure to install it:

```bash
pnpm add @lara-node/core reflect-metadata
```

## Required Dependencies

LaraNode requires these base packages:

```bash
pnpm add express cors reflect-metadata
```

## TypeScript Configuration

LaraNode uses decorators and requires specific TypeScript settings:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node"
  }
}
```

## Environment Setup

Create a `.env` file in your project root:

```dotenv
# Application
NODE_ENV=development
APP_KEY=base64:your-generated-key-here
APP_PORT=3000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=vest_app

# Cache
CACHE_DRIVER=file

# Queue
QUEUE_CONNECTION=sync

# Mail
MAIL_DRIVER=log
```

Generate an application key:

```bash
pnpm exec artisan key:generate
```

## Verify Installation

Create a simple test:

```typescript
import { Application, Container } from '@lara-node/core'

const container = new Container()
const app = new Application(container)

await app.boot()
console.log('LaraNode is working!')
```

## Next Steps

- [Project Structure](/guide/project-structure) -- Understand the directory layout
- [Configuration](/guide/configuration) -- Configure your application
- [Core Package](/packages/core) -- Learn about the core container
