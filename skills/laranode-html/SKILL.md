---
name: laranode-html
description: >-
  HTML utilities: template rendering with variable interpolation, HTML minification,
  sanitization, and HTML building helpers (tables, lists, pagination, breadcrumbs, meta tags).
  Activates for questions about Html facade, renderTemplate, compileTemplate,
  registerPartial, registerHelper, minifyHtml, or sanitizeHtml.
---

# @lara-node/html

HTML rendering, templating, minification, and sanitization.

## Key Exports

| Export | Description |
|--------|-------------|
| `Html` | HTML builder facade |
| `renderTemplate(template, data)` | Render template with variables |
| `compileTemplate(template)` | Compile template to reusable function |
| `registerPartial(name, template)` | Register partial for templates |
| `registerHelper(name, fn)` | Register template helper |
| `clearTemplateCache()` | Clear cached templates |
| `templateCacheSize()` | Get cache size |
| `minifyHtml(html, opts?)` | Minify HTML |
| `sanitizeHtml(html, opts?)` | Sanitize HTML |

## Quick Start

```typescript
import { Html, renderTemplate, minifyHtml, sanitizeHtml } from "@lara-node/html";

// Build HTML
const html = Html.table({ headers: ["Name", "Email"], rows: data });

// Render template
const rendered = renderTemplate("<h1>{{ title }}</h1>", { title: "Hello" });

// Minify
const minified = minifyHtml("<div>  <p>Hello</p>  </div>");

// Sanitize
const clean = sanitizeHtml("<script>alert('xss')</script><p>Safe</p>");
```
