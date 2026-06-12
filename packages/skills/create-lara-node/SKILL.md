---
name: create-lara-node — Project Scaffolding
description: >-
  Project scaffolding CLI tool (pnpm create laranode). Creates a complete LaraNode
  application with TypeScript config, service providers, sample models/controllers/services,
  environment config, and migrations/seeders. Activates for questions about project setup,
  scaffolding, or the create-lara-node package.
---

# create-lara-node

Project scaffolding tool for new LaraNode applications.

## Usage

```bash
pnpm create laranode my-app
cd my-app
pnpm install
```

## What It Creates

- Configured TypeScript project (ES2020, decorators, emitDecoratorMetadata)
- Service providers and bootstrapping (`src/bootstrap/app.ts`)
- Sample models, controllers, and services
- Environment configuration (`.env`)
- Migration and seeder setup
- Package.json with core dependencies

## Manual Setup Alternative

If you prefer to set up manually:

```bash
pnpm add @lara-node/core @lara-node/router @lara-node/db express reflect-metadata
pnpm add -D typescript @types/node @types/express
```

## Typical Project Structure

```
my-app/
├── src/
│   ├── bootstrap/
│   │   └── app.ts          # Application bootstrap
│   ├── app/
│   │   ├── Providers/
│   │   │   ├── AppServiceProvider.ts
│   │   │   └── RouteServiceProvider.ts
│   │   ├── Models/
│   │   ├── Controllers/
│   │   └── Services/
│   ├── config/              # Configuration files
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── server.ts            # Entry point
├── .env
├── tsconfig.json
└── package.json
```
