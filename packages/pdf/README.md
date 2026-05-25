# @lara-node/pdf

Laravel-inspired class-based PDF generation for [Lara-Node](https://github.com/VEN-LANG/vest), powered by [Puppeteer](https://pptr.dev/).

Inspired by [barryvdh/laravel-dompdf](https://github.com/barryvdh/laravel-dompdf).

## Installation

```bash
npm install @lara-node/pdf
# or
pnpm add @lara-node/pdf
```

**Peer dependencies:** `express`

> Puppeteer downloads Chromium automatically on first install.

---

## Quick Start

```typescript
import { PDF } from '@lara-node/pdf';

// From an HTML string
const pdf = PDF.loadHTML('<h1>Invoice #{{number}}</h1>', { number: 1042 });

// Configure
pdf
  .setPaper('a4', 'portrait')
  .setMargins({ top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' })
  .addPageNumbers();

// Download via Express
app.get('/invoice/:id', async (req, res) => {
  await pdf.download(res, `invoice-${req.params.id}.pdf`);
});

// Save to disk
await pdf.save('/tmp/invoice.pdf');

// Get as Buffer
const buf = await pdf.output('buffer');

// Get as base64
const b64 = await pdf.base64();
```

---

## Loading HTML

### `PDF.loadHTML(html, data?)`

Create a PDF from an inline HTML string. Supports `{{variable}}` interpolation.

```typescript
const pdf = PDF.loadHTML(`
  <!DOCTYPE html>
  <html>
    <head><style>body { font-family: sans-serif; }</style></head>
    <body>
      <h1>Hello, {{name}}!</h1>
      <p>Order total: {{total}}</p>
    </body>
  </html>
`, { name: 'Alice', total: '$99.00' });
```

### `PDF.loadView(filePath, data?)`

Read an HTML file from disk and interpolate variables.

```typescript
const pdf = await PDF.loadView('/views/invoice.html', { invoice, company });
```

### `PDF.loadFile(filePath)`

Read an HTML file from disk without variable interpolation.

```typescript
const pdf = await PDF.loadFile('/reports/static-report.html');
```

### `PDF.loadUrl(url)`

Navigate Puppeteer to a URL and capture the rendered page.

```typescript
const pdf = await PDF.loadUrl('https://example.com/report');
```

---

## Configuration (Fluent API)

All configuration methods return `this`, so they can be chained.

### Paper & Orientation

```typescript
pdf.setPaper('a4', 'portrait');   // 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid'
pdf.setOrientation('landscape');
```

### Margins

```typescript
pdf.setMargins({ top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' });
```

### Viewport

Override Puppeteer's default viewport for responsive layouts.

```typescript
pdf.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
```

### Scale

Set the CSS print scale factor (0.1 – 2.0).

```typescript
pdf.setScale(0.9);
```

### Page Ranges

Print only specific pages.

```typescript
pdf.setPageRanges('1-3, 5'); // pages 1, 2, 3 and 5
```

### Background Colour

```typescript
pdf.setBackground('#f8f9fa');
```

### Extra CSS

Inject additional styles into the rendered document.

```typescript
pdf.addStyles(`
  body { font-size: 12pt; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #ccc; padding: 4px 8px; }
`);
```

### Extra JavaScript

Inject JavaScript that runs in the page before the PDF is captured.

```typescript
pdf.addScript(`document.querySelectorAll('.no-print').forEach(el => el.remove());`);
```

### Header & Footer

Use Puppeteer's special `<span class="pageNumber">` / `<span class="totalPages">` classes.

```typescript
pdf.setHeader(
  `<div style="font-size:9px;text-align:right;width:100%;padding-right:10mm">
     CONFIDENTIAL — {{company}}
   </div>`,
  { height: '15mm' }
);

pdf.setFooter(
  `<div style="font-size:9px;text-align:center;width:100%">
     Page <span class="pageNumber"></span> of <span class="totalPages"></span>
   </div>`,
  { height: '10mm' }
);
```

### Convenience Page Numbers

```typescript
// Default: "1 / 5"
pdf.addPageNumbers();

// Custom format
pdf.addPageNumbers('Page {pageNumber} of {totalPages}', { height: '12mm' });
```

### Watermark

Overlays a diagonal watermark on every page via CSS `::after`.

```typescript
pdf.setWatermark('CONFIDENTIAL', {
  opacity: 0.12,
  fontSize: 72,
  rotation: -45,
  color: '#cc0000',
});
```

### Document Metadata

```typescript
pdf.setMetadata({
  title: 'Invoice #1042',
  author: 'Acme Corp',
  subject: 'Monthly Invoice',
  keywords: 'invoice, billing',
  creator: 'Lara-Node PDF',
});
```

---

## Output

### `pdf.output(format?)`

Returns a `Buffer` (default) or `base64` string.

```typescript
const buf = await pdf.output();
const buf = await pdf.output('buffer');
const b64 = await pdf.output('base64');
```

### `pdf.base64()`

Convenience alias for `pdf.output('base64')`.

### `pdf.save(filePath)`

Write the PDF file to disk.

```typescript
await pdf.save('/var/reports/report-2024.pdf');
```

### `pdf.download(res, filename)`

Send as an attachment via Express.

```typescript
await pdf.download(res, 'report.pdf');
```

### `pdf.stream(res, filename)`

Render inline in the browser (uses `Content-Disposition: inline`).

```typescript
await pdf.stream(res, 'report.pdf');
```

### `pdf.screenshot(options?)`

Capture a screenshot of the rendered HTML page instead of a PDF.

```typescript
const png = await pdf.screenshot({ type: 'png', fullPage: true });
const jpg = await pdf.screenshot({ type: 'jpeg', quality: 85 });

// Send as image response
res.setHeader('Content-Type', 'image/png');
res.end(png);
```

---

## Batch Generation

Generate multiple PDFs in parallel.

```typescript
await PDF.batch([
  { pdf: PDF.loadHTML(template, dataA), filePath: '/tmp/report-a.pdf' },
  { pdf: PDF.loadHTML(template, dataB), filePath: '/tmp/report-b.pdf' },
  { pdf: await PDF.loadView('/views/invoice.html', invoiceData), filePath: '/tmp/invoice.pdf' },
]);
```

---

## Browser Lifecycle

A singleton Puppeteer browser instance is shared across all PDF operations. Close it when your process exits:

```typescript
import { closeBrowser } from '@lara-node/pdf';

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
```

Or use the static method:

```typescript
await PDF.closeBrowser();
```

---

## Supported Paper Sizes

| Size | Dimensions |
|------|-----------|
| `a3` | 297 × 420 mm |
| `a4` | 210 × 297 mm |
| `a5` | 148 × 210 mm |
| `letter` | 216 × 279 mm |
| `legal` | 216 × 356 mm |
| `tabloid` | 279 × 432 mm |

---

## License

MIT
