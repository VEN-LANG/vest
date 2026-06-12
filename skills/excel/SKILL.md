---
name: excel
description: >-
  Excel (.xlsx) generation and import using SheetJS. Supports export with concerns
  (headings, mapping, styles, column formatting, multiple sheets, auto-filter, frozen
  rows/columns, tab colors, conditional formatting, protection) and import with
  batch inserts and chunk reading. Activates for questions about Excel facade,
  Exportable, Importable, or SheetJS integration.
---

# @lara-node/excel

Excel (.xlsx) file generation and import using SheetJS.

## Key Exports

| Export | Description |
|--------|-------------|
| `Excel` | Main facade |
| `Exportable` interface | Concerns: WithHeadings, WithMapping, WithStyles, WithColumnFormatting, WithMultipleSheets, WithTitle, WithProperties, WithEvents, WithAutoFilter, WithFrozenRows, WithFrozenColumns, WithTabColor, WithColumnWidths, WithRowHeights, WithProtection, WithConditionalFormatting |
| `Importable` interface | Concerns: WithBatchInserts, WithChunkReading, BeforeImport, AfterImport, WithStartRow |

## Quick Start

```typescript
import { Excel } from "@lara-node/excel";

// Export to file
await Excel.store(usersExportable, "./users.xlsx");

// Export as download
await Excel.download(usersExportable, "users.xlsx", res);

// Export to buffer
const buffer = await Excel.raw(usersExportable);
```
