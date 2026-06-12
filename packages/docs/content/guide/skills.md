---
title: Agent Skills
description: Specialized instructions that help AI assistants work with LaraNode effectively
navigation:
  title: Agent Skills
---

# Agent Skills

LaraNode includes a comprehensive set of [Agent Skills](https://www.skills.sh/) &mdash; specialized instructions that help AI assistants work with the framework more effectively. Each skill is a `SKILL.md` file containing YAML frontmatter metadata and markdown body with API references, code patterns, and common tasks.

## Available Skills

All skills are located in the root `skills/` directory of the LaraNode monorepo:

### Framework & Tooling

| Skill Name | File | Description |
|-----------|------|-------------|
| `laranode-framework` | `skills/laranode-framework/SKILL.md` | Framework overview, philosophy, architecture, getting started |
| `laranode-create-lara-node` | `skills/laranode-create-lara-node/SKILL.md` | Project scaffolding with `pnpm create laranode` |

### Core Infrastructure

| Skill Name | Package | Description |
|-----------|---------|-------------|
| `laranode-core` | `skills/laranode-core/SKILL.md` | IoC container, Application, Service Providers, Config |
| `laranode-router` | `skills/laranode-router/SKILL.md` | Routing, controllers, decorators, OpenAPI |
| `laranode-middlewares` | `skills/laranode-middlewares/SKILL.md` | Pre-built HTTP middleware (auth, logging, error handling) |
| `laranode-console` | `skills/laranode-console/SKILL.md` | Artisan CLI, 40+ commands, custom commands |

### Data & Validation

| Skill Name | Package | Description |
|-----------|---------|-------------|
| `laranode-db` | `skills/laranode-db/SKILL.md` | Eloquent ORM, models, migrations, query builder, relationships, traits |
| `laranode-validator` | `skills/laranode-validator/SKILL.md` | 50+ validation rules, custom rules, dot-notation |
| `laranode-cache` | `skills/laranode-cache/SKILL.md` | Multi-driver caching (file, DB, Redis), rate limiting |

### Async & Communication

| Skill Name | Package | Description |
|-----------|---------|-------------|
| `laranode-queue` | `skills/laranode-queue/SKILL.md` | Job queue, workers, scheduler, failed jobs |
| `laranode-events` | `skills/laranode-events/SKILL.md` | Event dispatcher, listeners, broadcasting |
| `laranode-mail` | `skills/laranode-mail/SKILL.md` | Multi-driver email, Mailable classes |

### Security

| Skill Name | Package | Description |
|-----------|---------|-------------|
| `laranode-auth` | `skills/laranode-auth/SKILL.md` | JWT auth, bcrypt hashing, token encryption |

### Date/Time

| Skill Name | Package | Description |
|-----------|---------|-------------|
| `laranode-carbon` | `skills/laranode-carbon/SKILL.md` | Carbon-inspired date/time library |

### File Export

| Skill Name | Package | Description |
|-----------|---------|-------------|
| `laranode-exports` | `skills/laranode-exports/SKILL.md` | PDF, Excel & CSV exports |
| `laranode-csv` | `skills/laranode-csv/SKILL.md` | CSV generation, parsing, streaming, manipulation |
| `laranode-excel` | `skills/laranode-excel/SKILL.md` | Excel .xlsx generation & parsing |
| `laranode-pdf` | `skills/laranode-pdf/SKILL.md` | PDF generation via Puppeteer |
| `laranode-xml` | `skills/laranode-xml/SKILL.md` | XML building, parsing, serialization, RSS/Atom/sitemap |
| `laranode-html` | `skills/laranode-html/SKILL.md` | HTML rendering, templating, minification, sanitization |

### Monitoring

| Skill Name | Package | Description |
|-----------|---------|-------------|
| `laranode-horizon` | `skills/laranode-horizon/SKILL.md` | Queue monitoring dashboard |
| `laranode-telescope` | `skills/laranode-telescope/SKILL.md` | Debug & observability dashboard |

## Setting Up Skills

### Using skills.sh

Run the [skills.sh](https://www.skills.sh/) script in the LaraNode repository root:
### Using npx

```bash
npx skills add VEN-LANG/vest
```

## How Skills Work

When an AI assistant connected to the LaraNode repository receives a question, it automatically loads the relevant skill based on the `description` field. The skill provides precise, contextual guidance specific to the matched package.

### Example Activations

| User Question | Activated Skill | Guidance Provided |
|---------------|-----------------|-------------------|
| "How do I set up model relationships?" | `laranode-db` | Eloquent relationship patterns (hasMany, belongsTo, etc.) |
| "How do I define API routes?" | `laranode-router` | Route decorators, groups, resource routing |
| "Send email on user registration" | `laranode-events` + `laranode-mail` | Event listener + Mailable class patterns |
| "Cache database queries" | `laranode-cache` + `laranode-db` | Cache::remember() with query builder |
| "Authenticate API requests" | `laranode-auth` | JWT token generation + auth middleware |
| "Generate a PDF report" | `laranode-pdf` | PDF generation with Puppeteer options |
| "Parse user-uploaded CSV" | `laranode-csv` | CSV.parse(), import concerns, streaming |
| "Monitor queue performance" | `laranode-horizon` | Dashboard setup, worker management |
