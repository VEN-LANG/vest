# PDF Export

Generate PDF documents using `@lara-node/pdf`, powered by [Puppeteer](https://pptr.dev/).

```typescript
import { PDF, closeBrowser } from '@lara-node/pdf';
import type {
  PaperSize,
  Orientation,
  MarginOptions,
  ViewportOptions,
  HeaderFooterOptions,
  WatermarkOptions,
  PageMetadata,
  ScreenshotOptions,
} from '@lara-node/pdf';
```

---

## Quick Start

```typescript
import { PDF } from '@lara-node/pdf';

// From an HTML string with variable interpolation
const pdf = PDF.loadHTML('<h1>Invoice #{{number}}</h1>', { number: 1042 });

// Configure via fluent API
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
const buf = await pdf.output();

// Get as base64
const b64 = await pdf.base64();
```

---

## Loading HTML

### `PDF.loadHTML(html, data?)`

Create from an HTML string with `{{variable}}` interpolation.

```typescript
const pdf = PDF.loadHTML(`
  <h1>Hello, {{name}}!</h1>
  <p>Order total: {{total}}</p>
`, { name: 'Alice', total: '$99.00' });
```

### `PDF.loadView(filePath, data?)`

Read an HTML file and interpolate variables.

```typescript
const pdf = await PDF.loadView('/views/invoice.html', { invoice, company });
```

### `PDF.loadFile(filePath)`

Read an HTML file without interpolation.

```typescript
const pdf = await PDF.loadFile('/reports/static-report.html');
```

### `PDF.loadUrl(url)`

Navigate to a URL and capture the rendered page.

```typescript
const pdf = await PDF.loadUrl('https://example.com/report');
```

---

## Configuration (Fluent API)

All config methods return `this` for chaining.

### Paper & Orientation

```typescript
pdf.setPaper('a4', 'portrait');    // 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid'
pdf.setOrientation('landscape');
```

### Margins

```typescript
pdf.setMargins({ top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' });
```

### Viewport

```typescript
pdf.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
```

### Scale

```typescript
pdf.setScale(0.9); // 0.1 – 2.0
```

### Page Ranges

```typescript
pdf.setPageRanges('1-3, 5');
```

### Background Colour

```typescript
pdf.setBackground('#f8f9fa');
```

### Extra CSS

```typescript
pdf.addStyles(`
  body { font-size: 12pt; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #ccc; padding: 4px 8px; }
`);
```

### Extra JavaScript

```typescript
pdf.addScript(`document.querySelectorAll('.no-print').forEach(el => el.remove());`);
```

### Header & Footer

Use Puppeteer's special `pageNumber` / `totalPages` classes.

```typescript
pdf.setHeader(
  `<div style="font-size:9px;text-align:right;width:100%;padding-right:10mm">
     CONFIDENTIAL — {{company}}
   </div>`,
  { height: '15mm' },
);

pdf.setFooter(
  `<div style="font-size:9px;text-align:center;width:100%">
     Page <span class="pageNumber"></span> of <span class="totalPages"></span>
   </div>`,
  { height: '10mm' },
);
```

### Page Numbers (convenience)

```typescript
pdf.addPageNumbers(); // "1 / 5"

pdf.addPageNumbers('Page {pageNumber} of {totalPages}', { height: '12mm' });
```

### Watermark

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

### Low-level Puppeteer options

```typescript
pdf.setOption('printBackground', false);
pdf.setOptions({ preferCSSPageSize: true, omitBackground: true });
```

---

## Output

### `pdf.output(format?)`

Returns `Buffer` (default) or `base64`.

```typescript
const buf = await pdf.output();
const buf = await pdf.output('buffer');
const b64 = await pdf.output('base64');
```

### `pdf.base64()`

Convenience alias for `pdf.output('base64')`.

### `pdf.save(filePath)`

```typescript
await pdf.save('/var/reports/report-2024.pdf');
```

### `pdf.download(res, filename)`

Send as attachment via Express.

```typescript
await pdf.download(res, 'report.pdf');
```

### `pdf.stream(res, filename)`

Render inline in the browser (`Content-Disposition: inline`).

```typescript
await pdf.stream(res, 'report.pdf');
```

### `pdf.screenshot(options?)`

Capture a screenshot instead of a PDF.

```typescript
const png = await pdf.screenshot({ type: 'png', fullPage: true });
const jpg = await pdf.screenshot({ type: 'jpeg', quality: 85 });

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

A singleton Puppeteer browser is shared across all operations.

```typescript
import { closeBrowser } from '@lara-node/pdf';

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

// Or via the static method:
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
