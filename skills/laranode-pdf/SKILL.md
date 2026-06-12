---
name: laranode-pdf
description: >-
  PDF generation from HTML using Puppeteer. Supports paper sizes, orientation,
  headers/footers, watermarks, margins, viewport options, page metadata, and
  screenshots. Activates for questions about PDF, Pdf, toPDF, toPDFFromTemplate,
  getBrowser, closeBrowser, or Puppeteer PDF options.
---

# @lara-node/pdf

PDF generation from HTML using Puppeteer.

## Key Exports

| Export | Description |
|--------|-------------|
| `Pdf` / `PDF` | PDF generation facade |
| `getBrowser()` | Get or launch Puppeteer browser |
| `closeBrowser()` | Close the browser instance |

### Types

PaperSize, Orientation, PdfOutputFormat, PaperOptions, HeaderFooterOptions, WatermarkOptions, MarginOptions, ViewportOptions, PageMetadata, ScreenshotOptions, PdfOptions.

## Quick Start

```typescript
import { PDF } from "@lara-node/pdf";

// Generate PDF from HTML
const pdf = await PDF.toPdf("<h1>Invoice</h1><p>Amount: $100</p>", {
  format: "A4",
  landscape: false,
  margin: { top: "20mm", bottom: "20mm" },
});

// Save to file
await PDF.store(pdf, "./invoice.pdf");

// Send as download
await PDF.download(pdf, "invoice.pdf", res);
```
