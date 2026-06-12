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

The documentation supports Agent Skills &mdash; specialized instructions that help AI assistants work with LaraNode more effectively. See the [skills.sh](<a href="https://www.skills.sh/" target="_blank">SKILLS.sh</a>) script to set up agent skills.
