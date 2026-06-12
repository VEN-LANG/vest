---
title: Agent Skills
description: Specialized instructions that help AI assistants work with LaraNode effectively
navigation:
  title: Agent Skills
---

# Agent Skills

LaraNode includes a comprehensive set of [Agent Skills](https://www.skills.sh/) &mdash; specialized instructions that help AI assistants work with the framework more effectively. Each skill is a `SKILL.md` file containing YAML frontmatter metadata and markdown body with API references, code patterns, and common tasks.

## Available Skills

All skills are located in the `packages/skills/` directory of the LaraNode monorepo:

### Framework & Tooling

| Skill | File | Description |
|-------|------|-------------|
| Root | `packages/skills/SKILL.md` | Framework overview, philosophy, architecture, getting started |
| Scaffolding | `packages/skills/create-lara-node/SKILL.md` | Project scaffolding with `pnpm create laranode` |

### Core Infrastructure

| Skill | Package | Description |
|-------|---------|-------------|
| Core | `packages/skills/core/SKILL.md` | IoC container, Application, Service Providers, Config |
| Router | `packages/skills/router/SKILL.md` | Routing, controllers, decorators, OpenAPI |
| Middlewares | `packages/skills/middlewares/SKILL.md` | Pre-built HTTP middleware (auth, logging, error handling) |
| Console | `packages/skills/console/SKILL.md` | Artisan CLI, 40+ commands, custom commands |

### Data & Validation

| Skill | Package | Description |
|-------|---------|-------------|
| DB | `packages/skills/db/SKILL.md` | Eloquent ORM, models, migrations, query builder, relationships, traits |
| Validator | `packages/skills/validator/SKILL.md` | 50+ validation rules, custom rules, dot-notation |
| Cache | `packages/skills/cache/SKILL.md` | Multi-driver caching (file, DB, Redis), rate limiting |

### Async & Communication

| Skill | Package | Description |
|-------|---------|-------------|
| Queue | `packages/skills/queue/SKILL.md` | Job queue, workers, scheduler, failed jobs |
| Events | `packages/skills/events/SKILL.md` | Event dispatcher, listeners, broadcasting |
| Mail | `packages/skills/mail/SKILL.md` | Multi-driver email, Mailable classes |

### Security

| Skill | Package | Description |
|-------|---------|-------------|
| Auth | `packages/skills/auth/SKILL.md` | JWT auth, bcrypt hashing, token encryption |

### Date/Time

| Skill | Package | Description |
|-------|---------|-------------|
| Carbon | `packages/skills/carbon/SKILL.md` | Carbon-inspired date/time library |

### File Export

| Skill | Package | Description |
|-------|---------|-------------|
| Exports | `packages/skills/exports/SKILL.md` | PDF, Excel & CSV exports |
| CSV | `packages/skills/csv/SKILL.md` | CSV generation, parsing, streaming, manipulation |
| Excel | `packages/skills/excel/SKILL.md` | Excel .xlsx generation & parsing |
| PDF | `packages/skills/pdf/SKILL.md` | PDF generation via Puppeteer |
| XML | `packages/skills/xml/SKILL.md` | XML building, parsing, serialization, RSS/Atom/sitemap |
| HTML | `packages/skills/html/SKILL.md` | HTML rendering, templating, minification, sanitization |

### Monitoring

| Skill | Package | Description |
|-------|---------|-------------|
| Horizon | `packages/skills/horizon/SKILL.md` | Queue monitoring dashboard |
| Telescope | `packages/skills/telescope/SKILL.md` | Debug & observability dashboard |

## Setting Up Skills

### Using skills.sh

Run the [skills.sh](https://www.skills.sh/) script in the LaraNode repository root:

```bash
curl -fsSL https://skills.sh/install.sh | bash
skills link packages/skills
```

### Using npx

```bash
npx skills.sh link packages/skills
```

### OpenCode / AgentSkills MCP

If you use OpenCode, the LaraNode repository already has the `agentskills.io` MCP server configured in `opencode.json`:

```json
{
  "mcp": {
    "agentskills": {
      "type": "remote",
      "url": "https://agentskills.io/mcp",
      "enabled": true
    }
  }
}
```

## Skill Structure

Each skill follows the [Agent Skills specification](https://agentskills.io/specification):

```
packages/skills/<package>/
├── SKILL.md   # Required: metadata + instructions
```

The `SKILL.md` file has two parts:

1. **YAML Frontmatter** between `---` delimiters with `name` and `description` fields
2. **Markdown body** with API references, code examples, common patterns, and step-by-step instructions

## How Skills Work

When an AI assistant connected to the LaraNode repository receives a question, it automatically loads the relevant skill based on the `description` field. The skill provides precise, contextual guidance specific to the matched package.

### Example Activations

| User Question | Activated Skill | Guidance Provided |
|---------------|-----------------|-------------------|
| "How do I set up model relationships?" | DB | Eloquent relationship patterns (hasMany, belongsTo, etc.) |
| "How do I define API routes?" | Router | Route decorators, groups, resource routing |
| "Send email on user registration" | Events + Mail | Event listener + Mailable class patterns |
| "Cache database queries" | Cache + DB | Cache::remember() with query builder |
| "Authenticate API requests" | Auth | JWT token generation + auth middleware |
| "Generate a PDF report" | PDF | PDF generation with Puppeteer options |
| "Parse user-uploaded CSV" | CSV | CSV.parse(), import concerns, streaming |
| "Monitor queue performance" | Horizon | Dashboard setup, worker management |
