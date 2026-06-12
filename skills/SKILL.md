---
name: LaraNode Framework
description: >-
  General LaraNode framework knowledge. Activates for broad questions about the framework,
  its architecture, philosophy, package ecosystem, or when the user asks "how do I" without
  specifying a package. Does NOT activate when the user asks about a specific package like
  routing, database, auth, or validation — those have dedicated skills.
---

# LaraNode Framework

LaraNode is a **Laravel-inspired Node.js framework** built on Express.js. It brings elegant developer experience to the Node.js ecosystem.

## Philosophy

1. **Developer Experience** — Expressive, readable APIs
2. **Convention over Configuration** — Sensible defaults
3. **Batteries Included** — Everything you need out of the box
4. **Elegant Architecture** — IoC container, service providers, facades

## Architecture

```
Application
├── Container (IoC) — Dependency injection with automatic resolution
├── Service Providers — Modular service registration
├── Middleware Stack — Laravel-style middleware management
├── Configuration System — Dot-notation config
└── Express Instance — Underlying HTTP server
```

## Package Ecosystem

| Package | Description |
|---------|-------------|
| `@lara-node/core` | IoC container, Application, Service Providers |
| `@lara-node/db` | Eloquent ORM with MySQL & MongoDB |
| `@lara-node/router` | Expressive routing with decorators |
| `@lara-node/auth` | JWT authentication & password hashing |
| `@lara-node/validator` | 50+ validation rules |
| `@lara-node/cache` | Multi-driver caching & rate limiting |
| `@lara-node/queue` | Job queues with workers & scheduler |
| `@lara-node/events` | Event dispatcher & broadcasting |
| `@lara-node/mail` | Multi-driver email system |
| `@lara-node/middlewares` | Pre-built HTTP middleware |
| `@lara-node/carbon` | Carbon-inspired date/time library |
| `@lara-node/console` | Artisan-style CLI (40+ commands) |
| `@lara-node/horizon` | Queue monitoring dashboard |
| `@lara-node/telescope` | Debug & observability dashboard |
| `@lara-node/exports` | PDF, Excel & CSV export utilities |
| `@lara-node/csv` | CSV generation, parsing, streaming |
| `@lara-node/excel` | Excel file generation & parsing |
| `@lara-node/html` | HTML rendering, templating, minification |
| `@lara-node/pdf` | PDF generation via Puppeteer |
| `@lara-node/xml` | XML building, parsing, serialization |

## Getting Started

```bash
pnpm create laranode my-app
cd my-app
pnpm install
```

## Common Patterns

- **Service Providers**: Central place for configuring application. Register bindings in `register()`, boot services in `boot()`.
- **Facades**: Static proxy to underlying container instances (e.g., `Cache.get()`, `Route.get()`).
- **Container**: `container.make(ServiceClass)` resolves dependencies automatically.
- **Configuration**: Access via `config('key')`, set via `setConfig('key', value)`.

## Skill Directories

Each LaraNode package has a dedicated skill in `packages/skills/<package>/SKILL.md` with detailed API references, code patterns, and common tasks.
