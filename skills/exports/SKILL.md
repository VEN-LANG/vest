---
name: exports
description: >-
  PDF generation via Puppeteer, Excel via SheetJS, and CSV export. Template support
  with variable interpolation and custom delimiters. Activates for questions about
  toPDF(), toPDFFromTemplate(), toExcel(), toCSV(), or closeBrowser().
---

# @lara-node/exports

PDF, Excel, and CSV export utilities.

## Key Exports

| Export | Description |
|--------|-------------|
| `toPDF(html, options)` | Generate PDF from HTML string |
| `toPDFFromTemplate(template, data)` | Generate PDF from HTML template |
| `closeBrowser()` | Close the Puppeteer browser |
| `toExcel(data)` | Generate Excel from array of objects |
| `toExcelFromTemplate(data, config)` | Generate Excel using column config |
| `toCSV(data)` | Generate CSV from array of objects |
| `toCSVFromTemplate(data, config)` | Generate CSV using column config |

## Quick Start

```typescript
import { toPDF, toExcel, toCSV } from "@lara-node/exports";

// PDF
const pdf = await toPDF("<h1>Hello</h1>", { format: "A4" });
const pdf2 = await toPDFFromTemplate("invoice.html", { title: "Invoice #1" });

// Excel
const xlsx = toExcel([
  { name: "Alice", email: "alice@test.com" },
  { name: "Bob", email: "bob@test.com" },
]);

// CSV
const csv = toCSV([
  { name: "Alice", email: "alice@test.com" },
]);
```
