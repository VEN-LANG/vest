---
name: @lara-node/xml — XML Building, Parsing & Serialization
description: >-
  XML utilities: builder (XmlBuilder), parser (XmlParser), facade (Xml), and
  serializer helpers (fromObject, fromArray, prettyPrint, compact, escape,
  unescape, validate). Supports RSS, Atom feeds, and sitemap generation.
  Activates for questions about Xml, XmlBuilder, XmlParser, fromObject,
  fromArray, prettyPrint, RSS/Atom/sitemap generation, or XML validation.
---

# @lara-node/xml

XML building, parsing, serialization, and validation.

## Key Exports

| Export | Description |
|--------|-------------|
| `Xml` | Main XML facade |
| `XmlBuilder` | Fluent XML document builder |
| `XmlParser` | XML string parser |
| `fromObject(obj)` | Convert object to XML string |
| `fromArray(arr, root?)` | Convert array to XML string |
| `prettyPrint(xml, opts?)` | Pretty-print XML |
| `compact(xml)` | Compact/compress XML |
| `escape(str)` | Escape XML entities |
| `unescape(str)` | Unescape XML entities |
| `validate(xml)` | Validate XML well-formedness |

### Feed/Sitemap Types

RssOptions, RssItem, AtomOptions, AtomEntry, SitemapUrl, SitemapOptions.

## Quick Start

```typescript
import { Xml, XmlBuilder, fromObject, prettyPrint } from "@lara-node/xml";

// Build XML
const builder = new XmlBuilder("root")
  .ele("item", { id: "1" })
    .ele("name").txt("Alice").up()
  .up();

// Object to XML
const xml = fromObject({ root: { item: { name: "Alice" } } });

// Pretty print
const formatted = prettyPrint(xml, { indent: 2 });

// RSS Feed
const rss = Xml.rss({
  title: "My Blog",
  link: "https://example.com",
  items: [{ title: "Post 1", description: "..." }],
});

// Sitemap
const sitemap = Xml.sitemap([
  { loc: "https://example.com", priority: 1.0 },
]);
```
