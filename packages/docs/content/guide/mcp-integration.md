---
title: MCP & AI Integration
description: Connect AI assistants to your LaraNode application using the Model Context Protocol
navigation:
  title: MCP & AI Integration
---

# MCP & AI Integration

LaraNode comes with built-in support for the Model Context Protocol (MCP). This allows AI assistants like Claude, Cursor, and ChatGPT to interact directly with your LaraNode application.

## MCP Server

The documentation site exposes an MCP server at `/mcp` that AI assistants can connect to. This provides tools for:

- **Listing documentation pages** &mdash; Discover all available documentation
- **Reading page content** &mdash; Retrieve specific documentation pages
- **Searching documentation** &mdash; Find relevant information quickly

## Connecting AI Assistants

### Cursor

1. Open Cursor Settings
2. Navigate to Features &rarr; MCP Servers
3. Add a new MCP server with URL: `https://laranode.doitrix.co.ke/mcp`

### VS Code

1. Install the MCP extension
2. Add the server URL: `https://laranode.doitrix.co.ke/mcp`

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "laranode-docs": {
      "url": "https://laranode.doitrix.co.ke/mcp"
    }
  }
}
```

## LLM Documentation

LaraNode provides LLM-optimized documentation:

- <a href="/llms.txt" target="_blank">llms.txt</a> &mdash; Concise documentation summary for LLMs
- <a href="/llms-full.txt" target="_blank">llms-full.txt</a> &mdash; Complete documentation for LLMs

## Agent Skills

LaraNode includes a comprehensive set of [Agent Skills](https://www.skills.sh/) &mdash; specialized instructions that help AI assistants work with the framework more effectively. Each skill provides detailed API references, code patterns, and common tasks for a specific package.

### Available Skills

The skills are located in `packages/skills/` and cover every LaraNode package:

| Skill | Package | Purpose |
|-------|---------|---------|
| Root Skill | — | Framework overview, philosophy, architecture |
| Core | `@lara-node/core` | IoC container, Application, Service Providers |
| DB | `@lara-node/db` | Eloquent ORM, Models, Migrations, Query Builder |
| Router | `@lara-node/router` | Routing, Controllers, OpenAPI generation |
| Auth | `@lara-node/auth` | JWT auth, password hashing, token encryption |
| Validator | `@lara-node/validator` | 50+ validation rules, custom rules |
| Cache | `@lara-node/cache` | Multi-driver caching, rate limiting |
| Queue | `@lara-node/queue` | Job queue, workers, scheduler |
| Events | `@lara-node/events` | Event dispatcher, listeners, broadcasting |
| Mail | `@lara-node/mail` | Multi-driver email, Mailable classes |
| Middlewares | `@lara-node/middlewares` | Pre-built HTTP middleware |
| Carbon | `@lara-node/carbon` | Date/time manipulation |
| Console | `@lara-node/console` | Artisan CLI, 40+ commands |
| Horizon | `@lara-node/horizon` | Queue monitoring dashboard |
| Telescope | `@lara-node/telescope` | Debug & observability dashboard |
| Exports | `@lara-node/exports` | PDF, Excel & CSV export utilities |
| CSV | `@lara-node/csv` | CSV generation, parsing, streaming |
| Excel | `@lara-node/excel` | Excel file generation & parsing |
| HTML | `@lara-node/html` | HTML rendering, templating, sanitization |
| PDF | `@lara-node/pdf` | PDF generation via Puppeteer |
| XML | `@lara-node/xml` | XML building, parsing, serialization |
| Scaffolding | `create-lara-node` | Project scaffolding |

### Setting Up Skills

To use Agent Skills with your AI assistant, run the [skills.sh](https://www.skills.sh/) script in the LaraNode repository root:

```bash
curl -fsSL https://skills.sh/install.sh | bash
skills link packages/skills
```

Or with npx:

```bash
npx skills.sh link packages/skills
```

### Skill Structure

Each skill is a directory containing a `SKILL.md` file:

```
packages/skills/
├── SKILL.md                    # Root framework skill
├── core/SKILL.md               # Core package skill
├── db/SKILL.md                 # Database ORM skill
├── router/SKILL.md             # Routing skill
└── ...                         # One per package
```

Skills follow the [Agent Skills specification](https://agentskills.io/specification) with YAML frontmatter (name, description) and markdown body with step-by-step instructions, code examples, and common patterns.

### Using Skills in AI Assistants

Skills are automatically loaded when your AI assistant connects to the LaraNode repository through any [skills.sh-compatible client](https://www.skills.sh/clients). When you ask a question about a specific package, the corresponding skill activates to provide precise, contextual guidance.

For example, asking "How do I set up model relationships?" activates the **DB skill**, which provides Eloquent relationship patterns. Asking "How do I define routes?" activates the **Router skill**.
