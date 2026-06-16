# Exports Package

The `@lara-node/exports` package provides PDF, Excel, and CSV export utilities.

## Installation

```bash
pnpm add @lara-node/exports puppeteer xlsx
```

## Overview

Features include:

- **PDF export** using Puppeteer — HTML to PDF with template support
- **Excel export** using SheetJS — array of objects to `.xlsx`
- **CSV export** — array of objects to CSV string
- **Template support** — render from HTML/JSON files with variable interpolation
- **Custom delimiters** — use any delimiter pair (e.g. `{{ }}`, `<% %>`)

## Quick Start

```typescript
import { toPDF, toExcel, toCSV } from "@lara-node/exports";

// PDF from HTML string
const pdf = await toPDF("<h1>Hello</h1>", { format: "A4" });

// PDF from template file
const pdf2 = await toPDFFromTemplate("invoice.html", { title: "Invoice #1" });

// Excel from data
const xlsx = toExcel([
  { name: "Alice", email: "alice@test.com" },
  { name: "Bob", email: "bob@test.com" },
]);

// CSV from data
const csv = toCSV([
  { name: "Alice", email: "alice@test.com" },
]);
```

## Key Exports

| Export                 | Description                         |
| ---------------------- | ----------------------------------- |
| `toPDF()`              | Generate PDF from HTML string       |
| `toPDFFromTemplate()`  | Generate PDF from HTML template     |
| `closeBrowser()`       | Close the Puppeteer browser         |
| `toExcel()`            | Generate Excel from array of data   |
| `toExcelFromTemplate()`| Generate Excel using column config  |
| `toCSV()`              | Generate CSV from array of data     |
| `toCSVFromTemplate()`  | Generate CSV using column config    |

## Next Steps

Explore the exports package to generate PDFs, Excel files, and CSV data for your application.
