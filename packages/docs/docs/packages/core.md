# Core Package

The `@lara-node/core` package is the foundation of the LaraNode framework. It provides the IoC container, Application bootstrap, Service Provider system, and configuration management.

## Installation

```bash
pnpm add @lara-node/core express cors reflect-metadata
```

## Overview

Core provides:

- **IoC Container** -- Dependency injection with automatic resolution
- **Application** -- Express wrapper with lifecycle management
- **Service Providers** -- Modular service registration
- **Middleware Stack** -- Laravel-style middleware management
- **Configuration** -- Dot-notation config system

## Quick Start

```typescript
import { Application, Container } from '@lara-node/core'
import 'reflect-metadata'

const container = new Container()
const app = new Application(container)

app.register(AppServiceProvider)

await app.boot()
await app.listen(3000)
```

## Key Exports

| Export | Description |
|--------|-------------|
| `Container` | IoC container class |
| `container` | Singleton container instance |
| `Application` | Application bootstrap class |
| `ServiceProvider` | Base class for service providers |
| `MiddlewareServiceProvider` | Base for middleware providers |
| `MiddlewareStack` | Middleware manager |
| `Injectable()` | DI decorator |
| `@Provider()` | Auto-discovery decorator |
| `config()` | Config helper |
| `setConfig()` | Set config value |
| `hasConfig()` | Check config exists |
| `allConfig()` | Get all config |

## Architecture

```
┌─────────────────────────────────────┐
│           Application               │
│  ┌─────────────┐  ┌──────────────┐  │
│  │  Container  │  │  Middleware  │  │
│  │   (IoC)     │  │    Stack     │  │
│  └─────────────┘  └──────────────┘  │
│  ┌───────────────────────────────┐  │
│  │     Service Providers         │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │     Configuration System      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Next Steps

- [Container](/packages/core/container) -- Deep dive into the IoC container
- [Application](/packages/core/application) -- Application bootstrap
- [Service Providers](/packages/core/service-providers) -- Creating providers
- [Configuration](/packages/core/config) -- Configuration system
