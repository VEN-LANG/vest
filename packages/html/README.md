# @lara-node/html

Handlebars-based HTML template rendering with a rich set of built-in helpers, minification, sanitization, and Express response helpers for [Lara-Node](https://github.com/VEN-LANG/vest).

## Installation

```bash
npm install @lara-node/html
# or
pnpm add @lara-node/html
```

**Peer dependencies:** `express`

---

## Quick Start

```typescript
import { Html } from '@lara-node/html';

// Inline template rendering
const html = Html.render('<h1>Hello, {{name}}!</h1>', { name: 'World' });

// File-based template
const page = await Html.renderFile('/views/user.hbs', { user });

// Express route
app.get('/dashboard', async (req, res) => {
  await Html.fileResponse(res, '/views/dashboard.hbs', { user: req.user });
});
```

---

## Template Rendering

### `Html.render(template, data?)`

Render a Handlebars template string synchronously. Results are cached automatically.

```typescript
const html = Html.render(
  '<p>{{uppercase name}} — {{date joinedAt}}</p>',
  { name: 'alice', joinedAt: '2024-01-15' }
);
// <p>ALICE — 1/15/2024</p>
```

### `Html.renderFile(filePath, data?)`

Read and render a template file (async).

```typescript
const html = await Html.renderFile('/views/invoice.hbs', {
  invoice,
  company: config.company,
});
```

### `Html.compile(template)`

Compile a template string into a reusable function for repeated renders.

```typescript
const tpl = Html.compile('<li>{{name}}: {{score}}</li>');
const rows = users.map((u) => tpl(u)).join('');
```

### Template Cache

The package caches compiled templates by template source string for performance.

```typescript
Html.cacheSize();  // number of cached templates
Html.clearCache(); // reset the cache
```

---

## Built-in Handlebars Helpers

All helpers are registered globally and available in every template.

### String Helpers

| Helper | Usage | Example output |
|--------|-------|----------------|
| `uppercase` | `{{uppercase str}}` | `HELLO` |
| `lowercase` | `{{lowercase str}}` | `hello` |
| `capitalize` | `{{capitalize str}}` | `Hello` |
| `titleCase` | `{{titleCase str}}` | `Hello World` |
| `truncate` | `{{truncate str 50 '...'}}` | `Hello...` |
| `slugify` | `{{slugify str}}` | `hello-world` |
| `nl2br` | `{{nl2br str}}` | `Hello<br>World` |
| `replace` | `{{replace str 'a' 'b'}}` | replaces `a` with `b` |
| `startsWith` | `{{startsWith str 'He'}}` | `true` |
| `endsWith` | `{{endsWith str 'lo'}}` | `true` |
| `padStart` | `{{padStart str 5 '0'}}` | `00042` |
| `padEnd` | `{{padEnd str 5 '-'}}` | `42---` |
| `repeat` | `{{repeat '* ' 3}}` | `* * * ` |
| `join` | `{{join array ', '}}` | `a, b, c` |

### Number Helpers

| Helper | Usage | Example output |
|--------|-------|----------------|
| `currency` | `{{currency price symbol='$'}}` | `$9.99` |
| `numberFormat` | `{{numberFormat n decimals=2}}` | `1,234.50` |
| `percentage` | `{{percentage value total}}` | `45.5%` |
| `round` | `{{round n 2}}` | `3.14` |
| `abs` | `{{abs n}}` | `42` |
| `add` | `{{add a b}}` | `10` |
| `sub` | `{{sub a b}}` | `5` |
| `mul` | `{{mul a b}}` | `20` |
| `div` | `{{div a b}}` | `2.5` |

### Date Helpers

| Helper | Usage | Example output |
|--------|-------|----------------|
| `date` | `{{date value locale='en-US'}}` | `1/15/2024` |
| `dateTime` | `{{dateTime value}}` | `1/15/2024, 3:00:00 PM` |

### Logic & Comparison Helpers

| Helper | Usage | Description |
|--------|-------|-------------|
| `eq` | `{{#if (eq a b)}}` | Strict equality |
| `neq` | `{{#if (neq a b)}}` | Strict inequality |
| `gt` | `{{#if (gt a b)}}` | Greater than |
| `gte` | `{{#if (gte a b)}}` | Greater than or equal |
| `lt` | `{{#if (lt a b)}}` | Less than |
| `lte` | `{{#if (lte a b)}}` | Less than or equal |
| `and` | `{{#if (and a b)}}` | Logical AND |
| `or` | `{{#if (or a b)}}` | Logical OR |
| `not` | `{{#if (not a)}}` | Logical NOT |
| `isEmpty` | `{{#if (isEmpty arr)}}` | Empty check (string/array/object) |
| `includes` | `{{#if (includes arr item)}}` | Array or string includes |

### Iteration Helpers

| Helper | Usage | Description |
|--------|-------|-------------|
| `times` | `{{#times 3}}...{{/times}}` | Repeat a block N times (exposes `index`, `first`, `last`) |
| `range` | `{{#range 1 5}}{{this}}{{/range}}` | Iterate from start to end inclusive |

### Miscellaneous

| Helper | Usage | Description |
|--------|-------|-------------|
| `pluralize` | `{{pluralize count 'item' 'items'}}` | Singular/plural based on count |
| `default` | `{{default value 'N/A'}}` | Fallback for null/undefined/empty |
| `json` | `{{{json obj}}}` | Pretty-print JSON (triple-mustache to skip escaping) |

---

## Partials & Custom Helpers

```typescript
// Register a partial
Html.registerPartial('header', '<header><h1>{{title}}</h1></header>');

// Use it: {{> header title="Dashboard"}}

// Register a custom helper
Html.registerHelper('formatPhone', (value: unknown) =>
  String(value).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
);
// Use it: {{formatPhone phone}}
```

---

## HTML Generation Utilities

### `Html.table(data, options?)`

Generate an HTML `<table>` from an array of objects.

```typescript
const html = Html.table(users, {
  columns: ['id', 'name', 'email'],
  headers: ['#', 'Full Name', 'Email Address'],
  tableAttributes: { class: 'table table-bordered' },
  stripedClass: 'odd',
  caption: 'Active Users',
});
```

### `Html.list(items, options?)`

Generate a `<ul>` or `<ol>` from an array.

```typescript
// Simple string list
Html.list(['Home', 'About', 'Contact'], { type: 'ol', listClass: 'nav' });

// Object list with links
Html.list(pages, {
  type: 'ul',
  labelKey: 'title',
  hrefKey: 'url',
  itemClass: 'nav-item',
});
```

### `Html.pagination(currentPage, totalPages, options)`

Generate paginated navigation links.

```typescript
const nav = Html.pagination(3, 10, {
  urlTemplate: '/users?page={page}',
  navClass: 'pagination',
  linkClass: 'page-link',
  activeClass: 'active',
  disabledClass: 'disabled',
  window: 2,
  prevLabel: '← Prev',
  nextLabel: 'Next →',
});
```

### `Html.breadcrumbs(items, options?)`

Generate an accessible breadcrumb trail.

```typescript
const crumbs = Html.breadcrumbs(
  [
    { label: 'Home', href: '/' },
    { label: 'Users', href: '/users' },
    { label: 'Alice' },
  ],
  { separator: ' › ', navClass: 'breadcrumb', ariaLabel: 'breadcrumb' },
);
```

### `Html.meta(tags)`

Generate `<meta>` tags from a descriptor array.

```typescript
const meta = Html.meta([
  { charset: 'UTF-8' },
  { name: 'description', content: 'My awesome app' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  { property: 'og:title', content: 'My App' },
  { property: 'og:image', content: 'https://example.com/og.png' },
  { httpEquiv: 'X-UA-Compatible', content: 'IE=edge' },
]);
```

### `Html.definitionList(data, dlClass?)`

Generate a `<dl>` definition list from a record.

```typescript
const dl = Html.definitionList({ Name: 'Alice', Role: 'Admin', Status: 'Active' }, 'dl-horizontal');
```

### `Html.select(name, options, selected?, attributes?)`

Generate a `<select>` dropdown.

```typescript
const select = Html.select(
  'country',
  [{ value: 'ke', label: 'Kenya' }, { value: 'ng', label: 'Nigeria' }],
  'ke',
  { class: 'form-select' },
);
```

### `Html.tag(tag, content, attributes?)` / `Html.link()` / `Html.image()`

Low-level element generators.

```typescript
Html.tag('span', 'Active', { class: 'badge badge-green' });
Html.link('/profile', 'View Profile', { class: 'btn' });
Html.image('/avatar.png', 'User avatar', { class: 'avatar', width: '64' });
```

---

## Minification

```typescript
const minified = Html.minify(html, {
  removeComments: true,       // default: true
  collapseWhitespace: true,   // default: true
  removeEmptyAttributes: true, // default: false
});
```

---

## Sanitization

Removes dangerous tags, event handlers, and `javascript:` URIs.

```typescript
const safe = Html.sanitize(userInput, {
  // Completely removed (including inner content)
  blockedTags: ['script', 'style', 'iframe', 'form'],
  // Only these tags are allowed (others are stripped, inner text preserved)
  allowedTags: ['p', 'b', 'i', 'a', 'ul', 'li'],
  // Additional attributes to strip
  stripAttributes: ['style'],
});
```

---

## Text Utilities

### `Html.strip(html)`

Remove all HTML tags and decode common entities.

```typescript
const text = Html.strip('<p>Hello <b>World</b></p>');
// "Hello World"
```

### `Html.excerpt(html, length?, suffix?)`

Extract a plain-text excerpt from HTML content.

```typescript
const summary = Html.excerpt(articleHtml, 160, '…');
```

---

## File Output

```typescript
// Save rendered template to disk
await Html.store('/public/report.html', template, { report });
```

---

## Express Helpers

```typescript
// Render inline template → HTML response
Html.response(res, '{{> layout}}', data);

// Render template file → HTML response
await Html.fileResponse(res, '/views/page.hbs', data);

// Send HTML file download
Html.download(res, generatedHtml, 'report.html');

// Send JSON response
Html.json(res, { success: true, data: users }, 200);
```

---

## License

MIT
