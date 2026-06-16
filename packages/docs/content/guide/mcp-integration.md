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
3. Add a new MCP server with URL: `https://laranode.doitrixtech.co.ke/mcp`

Or manually create/update `.cursor/mcp.json` in your project root:
```json [.cursor/mcp.json]
{
  "mcpServers": {
    "laranode-docs": {
      "type": "http",
      "url": "https://laranode.doitrixtech.co.ke/mcp"
    }
  }
}
```

### VS Code

1. Install the MCP extension
2. Add the server URL: `https://laranode.doitrixtech.co.ke/mcp`

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json [claude_desktop_config.json]
{
  "mcpServers": {
    "laranode-docs": {
      "url": "https://laranode.doitrixtech.co.ke/mcp"
    }
  }
}
```

### Claude Code 

Add the server using the CLI command:
```bash
claude mcp add --transport http laranode https://laranode.doitrixtech.co.ke/mcp
```

### Opencode

1. In your project root, create `opencode.json`
2. Add the following configuration:

```json [opencode.json]
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "agentskills": {
      "type": "remote",
      "url": "https://agentskills.io/mcp",
      "enabled": true
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

The skills are located in the root `skills/` directory and cover every LaraNode package:

| Skill Name | Package | Purpose |
|-----------|---------|---------|
| `laranode-framework` | — | Framework overview, philosophy, architecture |
| `laranode-core` | `@lara-node/core` | IoC container, Application, Service Providers |
| `laranode-db` | `@lara-node/db` | Eloquent ORM, Models, Migrations, Query Builder |
| `laranode-router` | `@lara-node/router` | Routing, Controllers, OpenAPI generation |
| `laranode-auth` | `@lara-node/auth` | JWT auth, password hashing, token encryption |
| `laranode-validator` | `@lara-node/validator` | 50+ validation rules, custom rules |
| `laranode-cache` | `@lara-node/cache` | Multi-driver caching, rate limiting |
| `laranode-queue` | `@lara-node/queue` | Job queue, workers, scheduler |
| `laranode-events` | `@lara-node/events` | Event dispatcher, listeners, broadcasting |
| `laranode-mail` | `@lara-node/mail` | Multi-driver email, Mailable classes |
| `laranode-middlewares` | `@lara-node/middlewares` | Pre-built HTTP middleware |
| `laranode-carbon` | `@lara-node/carbon` | Date/time manipulation |
| `laranode-console` | `@lara-node/console` | Artisan CLI, 40+ commands |
| `laranode-horizon` | `@lara-node/horizon` | Queue monitoring dashboard |
| `laranode-telescope` | `@lara-node/telescope` | Debug & observability dashboard |
| `laranode-exports` | `@lara-node/exports` | PDF, Excel & CSV export utilities |
| `laranode-csv` | `@lara-node/csv` | CSV generation, parsing, streaming |
| `laranode-excel` | `@lara-node/excel` | Excel file generation & parsing |
| `laranode-html` | `@lara-node/html` | HTML rendering, templating, sanitization |
| `laranode-pdf` | `@lara-node/pdf` | PDF generation via Puppeteer |
| `laranode-xml` | `@lara-node/xml` | XML building, parsing, serialization |
| `laranode-create-lara-node` | `create-lara-node` | Project scaffolding |

### Setting Up Skills

To use Agent Skills with your AI assistant, install the skills collection:

```bash
npx skills add laranode/lara-node
```


After installation, the skills are available at the root `skills/` directory.


### Using Skills in AI Assistants

Skills are automatically loaded when your AI assistant connects to the LaraNode repository through any [skills.sh-compatible client](https://www.skills.sh/clients). When you ask a question about a specific package, the corresponding skill activates to provide precise, contextual guidance.

For example, asking "How do I set up model relationships?" activates the **DB skill**, which provides Eloquent relationship patterns. Asking "How do I define routes?" activates the **Router skill**.
