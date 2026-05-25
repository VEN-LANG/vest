# @lara-node/xml

Pure TypeScript XML builder, parser, and utilities for [Lara-Node](https://github.com/VEN-LANG/vest), powered by [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser).

## Installation

```bash
npm install @lara-node/xml
# or
pnpm add @lara-node/xml
```

**Peer dependencies:** `express`

---

## Quick Start

```typescript
import { Xml } from '@lara-node/xml';

// Build XML with the fluent builder
const xml = Xml.create('catalog', { version: '1.0', encoding: 'UTF-8' })
  .ele('book').att('id', '1')
    .ele('title').txt('TypeScript Deep Dive').up()
    .ele('price').txt('29.99').up()
  .up()
  .end({ prettyPrint: true });

// Parse XML back to an object
const obj = Xml.parse(xml);
const title = Xml.get(obj, 'catalog.book.title');
```

---

## XmlBuilder — Fluent Builder

Create an `XmlBuilder` via `Xml.create()` and chain methods to build a document.

```typescript
import { Xml, XmlBuilder } from '@lara-node/xml';

const xml = Xml.create('root', { version: '1.0', encoding: 'UTF-8' })
  // Element with attributes
  .ele('users')
    .ele('user').att('id', '1').att('role', 'admin')
      .ele('name').txt('Alice').up()
      .ele('email').txt('alice@example.com').up()
      // CDATA section
      .ele('bio').cdata('<p>Hello & welcome!</p>').up()
    .up()
    .ele('user').att('id', '2')
      .ele('name').txt('Bob').up()
    .up()
  .up()
  // Comment
  .comment('End of users list')
  // Processing instruction
  .pi('xml-stylesheet', 'type="text/css" href="style.css"')
  // Namespace declaration
  .ns('xsi', 'http://www.w3.org/2001/XMLSchema-instance')
  // Raw XML injection (no escaping)
  .raw('<custom:element xmlns:custom="http://example.com/ns"/>')
  .end({ prettyPrint: true, indent: 2 });
```

### Builder Method Reference

| Method | Description |
|--------|-------------|
| `ele(tag)` | Add a child element and descend into it |
| `att(name, value)` | Add an attribute to the current element |
| `txt(value)` | Add an escaped text node |
| `cdata(value)` | Add a `<![CDATA[...]]>` section |
| `comment(text)` | Add an `<!-- ... -->` comment |
| `pi(target, content)` | Add a `<?target content?>` processing instruction |
| `ns(prefix, uri)` | Add a namespace declaration attribute |
| `raw(xmlString)` | Inject raw XML without escaping |
| `up()` | Ascend to the parent element |
| `end(options?)` | Serialize the tree to a string |

### `end(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prettyPrint` | `boolean` | `false` | Indent output |
| `indent` | `number` | `2` | Spaces per indent level |

---

## XmlParser — Parsing

### `Xml.parse(xml, options?)`

Parse an XML string into a plain JavaScript object.

```typescript
const obj = Xml.parse(xmlString, {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  parseAttributeValue: true,
  trimValues: true,
});
```

### `Xml.get(obj, path)`

Retrieve a nested value using dot notation. Array indices are supported.

```typescript
const title = Xml.get(obj, 'catalog.book.title');
const first  = Xml.get(obj, 'catalog.books.book.0.title');
```

### `Xml.find(obj, tag)`

Find the **first** element matching a tag name anywhere in the parsed tree.

```typescript
const user = Xml.find(obj, 'user');
```

### `Xml.findAll(obj, tag)`

Find **all** elements matching a tag name in the parsed tree.

```typescript
const allItems = Xml.findAll(obj, 'item');
```

### `XmlParser` class

Use directly for repeated parsing with shared options.

```typescript
import { XmlParser } from '@lara-node/xml';

const parser = new XmlParser({ ignoreAttributes: false });
const obj = parser.parse(xmlString);
const allUsers = parser.findAll(obj, 'user');
```

---

## Serialization Utilities

### `Xml.fromObject(obj, rootTag)`

Serialize a JavaScript object to XML.

```typescript
const xml = Xml.fromObject(
  { name: 'Alice', age: 30, roles: ['admin', 'user'] },
  'user'
);
// <user><name>Alice</name><age>30</age><roles>admin</roles><roles>user</roles></user>
```

### `Xml.fromArray(arr, options?)`

Serialize an array of objects to XML.

```typescript
const xml = Xml.fromArray(
  [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
  { root: 'users', item: 'user' }
);
```

### `Xml.fromJson(json, rootTag?)`

Convert a JSON string directly to XML.

```typescript
const xml = Xml.fromJson('{"name":"Alice","age":30}', 'user');
```

---

## Transformation Utilities

### `Xml.transform(xml, itemTag, fn, rootTag?, options?)`

Parse an XML collection, map each item, and re-serialize.

```typescript
const result = Xml.transform(
  usersXml,
  'user',
  (user) => ({ ...user, email: String(user.email).toLowerCase() }),
  'users',
);
```

### `Xml.merge(xmlA, xmlB, rootTag?, options?)`

Merge two XML documents by combining their child elements under a shared root.

```typescript
const merged = Xml.merge(xmlA, xmlB, 'merged');
```

### `Xml.toJson(xml, options?)`

Convert an XML string to a JSON string.

```typescript
const json = Xml.toJson(xmlString);
```

### `Xml.strip(xml)`

Strip all XML tags and return plain text content. CDATA sections are unwrapped.

```typescript
const text = Xml.strip('<root><item>Hello &amp; World</item></root>');
// "Hello &amp; World"
```

---

## Formatting Utilities

### `Xml.prettyPrint(xml, options?)`

Re-indent an XML string.

```typescript
const formatted = Xml.prettyPrint(compactXml, { indent: 4 });
```

### `Xml.compact(xml)`

Strip all indentation and newlines from an XML string.

```typescript
const compact = Xml.compact(formattedXml);
```

### `Xml.validate(xml)`

Check whether an XML string is well-formed. Returns `{ valid: boolean, error?: string }`.

```typescript
const { valid, error } = Xml.validate(xmlString);
if (!valid) console.error(error);
```

### `Xml.escape(str)` / `Xml.unescape(str)`

Escape or unescape XML special characters.

```typescript
Xml.escape('<script>alert("xss")</script>');
// &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;

Xml.unescape('&lt;b&gt;Hello&lt;/b&gt;');
// <b>Hello</b>
```

---

## Feed Generators

### `Xml.toRss(channel, items)`

Generate an RSS 2.0 feed.

```typescript
const rss = Xml.toRss(
  {
    title: 'My Blog',
    link: 'https://myblog.com',
    description: 'Latest posts',
    language: 'en-us',
    lastBuildDate: new Date(),
    generator: 'Lara-Node',
  },
  [
    {
      title: 'Hello World',
      link: 'https://myblog.com/hello-world',
      description: 'My first post',
      pubDate: new Date('2024-01-15'),
      guid: 'https://myblog.com/hello-world',
      author: 'alice@myblog.com',
      category: ['Node.js', 'TypeScript'],
    },
  ],
);

res.setHeader('Content-Type', 'application/rss+xml');
res.end(rss);
```

### `Xml.toAtom(feed, entries)`

Generate an Atom 1.0 feed.

```typescript
const atom = Xml.toAtom(
  {
    id: 'https://myblog.com/',
    title: 'My Blog',
    updated: new Date(),
    authorName: 'Alice',
    link: 'https://myblog.com',
  },
  [
    {
      id: 'https://myblog.com/hello-world',
      title: 'Hello World',
      updated: new Date('2024-01-15'),
      summary: 'My first post',
      content: '<p>Hello World!</p>',
      link: 'https://myblog.com/hello-world',
    },
  ],
);

res.setHeader('Content-Type', 'application/atom+xml');
res.end(atom);
```

### `Xml.toSitemap(urls, options?)`

Generate a sitemap.xml.

```typescript
const sitemap = Xml.toSitemap(
  [
    {
      loc: 'https://example.com/',
      lastmod: new Date(),
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      loc: 'https://example.com/about',
      changefreq: 'monthly',
      priority: 0.7,
    },
  ],
  { prettyPrint: true },
);

res.setHeader('Content-Type', 'application/xml');
res.end(sitemap);
```

---

## Express Helpers

```typescript
// Send XML response
Xml.response(res, xmlString);

// Send as a file download
Xml.download(res, xmlString, 'data.xml');

// Parse XML and respond with JSON
Xml.jsonResponse(res, xmlString);
```

---

## Low-level Serializer Functions

All functions from `serializer.ts` are individually exported:

```typescript
import { fromObject, fromArray, prettyPrint, compact, escape, unescape, validate } from '@lara-node/xml';
```

---

## ParseOptions Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attributeNamePrefix` | `string` | `''` | Prefix added to attribute keys |
| `ignoreAttributes` | `boolean` | `false` | Skip attributes entirely |
| `parseAttributeValue` | `boolean` | `false` | Cast attribute values to primitives |
| `trimValues` | `boolean` | `true` | Trim whitespace from text values |
| `isArray` | `function` | — | Force specific tags to always be arrays |

---

## License

MIT
