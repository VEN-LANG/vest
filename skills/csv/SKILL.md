---
name: csv
description: >-
  CSV utilities for export (download, store, raw, stream, toBuffer), import (parse,
  validate, transform), and manipulation (merge, filter, sort, deduplicate, select,
  columnStats). Supports custom delimiters, encoding, and chunked streaming.
  Activates for questions about CSV facade, CsvWriter, CsvReader, CsvExportable,
  or CsvImportable interfaces.
---

# @lara-node/csv

CSV generation, parsing, streaming, and manipulation utilities.

## Key Exports

| Export | Description |
|--------|-------------|
| `CSV` | Main facade with static methods |
| `CsvWriter` | Low-level CSV serialization |
| `CsvReader` | Low-level CSV parsing |

### CSV Facade Methods

| Method | Description |
|--------|-------------|
| `CSV.download(exportable, filename, res, opts?)` | Send CSV as HTTP download |
| `CSV.store(exportable, filePath, opts?)` | Save CSV to disk |
| `CSV.raw(exportable, opts?)` | Generate CSV string |
| `CSV.import(importable, source, opts?)` | Import CSV from file or string |
| `CSV.parse(csv, opts?)` | Parse CSV string to records |
| `CSV.fromArray(data, opts?)` | Build CSV from array of objects |
| `CSV.stream(exportable, opts?)` | Async generator for streaming |
| `CSV.parseBuffer(buf, opts?)` | Parse CSV Buffer |
| `CSV.toBuffer(exportable, opts?)` | Generate CSV Buffer |
| `CSV.count(csv, opts?)` | Count data rows |
| `CSV.columns(csv, opts?)` | Extract column names |
| `CSV.merge(csvStrings, opts?)` | Merge multiple CSV strings |
| `CSV.filter(csv, predicate, opts?)` | Filter rows |
| `CSV.transform(csv, fn, opts?)` | Transform rows |
| `CSV.sort(csv, columns, opts?)` | Sort rows by columns |
| `CSV.select(csv, columns, opts?)` | Select specific columns |
| `CSV.deduplicate(csv, keys?, opts?)` | Remove duplicate rows |
| `CSV.columnStats(csv, column, opts?)` | Stats for numeric column |

## Quick Start

```typescript
import { CSV } from "@lara-node/csv";

// Parse
const records = CSV.parse("name,age\nAlice,30\nBob,25");

// Build from array
const csv = CSV.fromArray([
  { name: "Alice", role: "Admin" },
  { name: "Bob", role: "User" },
]);

// Stream large datasets
for await (const chunk of CSV.stream(exportable, { chunkSize: 1000 })) {
  // process chunk
}
```
