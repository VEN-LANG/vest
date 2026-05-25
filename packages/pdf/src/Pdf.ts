import { readFile, writeFile } from 'node:fs/promises';
import type { Response } from 'express';
import type {
  PaperSize,
  Orientation,
  PdfOutputFormat,
  HeaderFooterOptions,
  WatermarkOptions,
  MarginOptions,
  ViewportOptions,
  PageMetadata,
  ScreenshotOptions,
  PdfOptions,
} from './types.js';
import { getBrowser, closeBrowser as closeBrowserSingleton } from './browser.js';

/** Paper dimensions in mm [width, height] for Puppeteer */
const PAPER_DIMENSIONS: Record<PaperSize, { width: string; height: string }> = {
  a3: { width: '297mm', height: '420mm' },
  a4: { width: '210mm', height: '297mm' },
  a5: { width: '148mm', height: '210mm' },
  letter: { width: '216mm', height: '279mm' },
  legal: { width: '216mm', height: '356mm' },
  tabloid: { width: '279mm', height: '432mm' },
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in data ? String(data[key]) : '',
  );
}

/**
 * Core PDF generation class.
 * Instantiated via the static factory methods on the `PDF` namespace.
 */
export class Pdf {
  private html: string;
  private options: PdfOptions = {};

  constructor(html: string) {
    this.html = html;
  }

  // -------------------------------------------------------------------------
  // Static factories
  // -------------------------------------------------------------------------

  /**
   * Create a PDF from an HTML string with optional template variable interpolation.
   *
   * @param html - HTML string, may contain `{{variable}}` placeholders.
   * @param data - Key/value pairs for template interpolation.
   */
  static loadHTML(html: string, data?: Record<string, unknown>): Pdf {
    return new Pdf(interpolate(html, data ?? {}));
  }

  /**
   * Create a PDF by reading an HTML file from disk and interpolating variables.
   *
   * @param filePath - Absolute path to the HTML template file.
   * @param data - Key/value pairs for template interpolation.
   */
  static async loadView(filePath: string, data?: Record<string, unknown>): Promise<Pdf> {
    const content = await readFile(filePath, 'utf-8');
    const rendered = data ? interpolate(content, data) : content;
    return new Pdf(rendered);
  }

  /**
   * Create a PDF by navigating Puppeteer to a URL.
   *
   * @param url - The URL to load.
   */
  static async loadUrl(url: string): Promise<Pdf> {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const content = await page.content();
    await page.close();
    return new Pdf(content);
  }

  /**
   * Create a PDF by reading an HTML file from disk (no interpolation).
   *
   * @param filePath - Absolute path to an HTML file.
   */
  static async loadFile(filePath: string): Promise<Pdf> {
    const content = await readFile(filePath, 'utf-8');
    return new Pdf(content);
  }

  /**
   * Close the shared Puppeteer browser singleton.
   */
  static async closeBrowser(): Promise<void> {
    await closeBrowserSingleton();
  }

  // -------------------------------------------------------------------------
  // Fluent configuration
  // -------------------------------------------------------------------------

  /**
   * Set the paper size, optionally with orientation.
   *
   * @param size - One of 'a3'|'a4'|'a5'|'letter'|'legal'|'tabloid'.
   * @param orientation - 'portrait' (default) or 'landscape'.
   */
  setPaper(size: PaperSize, orientation?: Orientation): this {
    this.options.paper = { size, orientation };
    return this;
  }

  /**
   * Set the page orientation.
   *
   * @param orientation - 'portrait' or 'landscape'.
   */
  setOrientation(orientation: Orientation): this {
    if (!this.options.paper) {
      this.options.paper = { size: 'a4', orientation };
    } else {
      this.options.paper.orientation = orientation;
    }
    return this;
  }

  /**
   * Set a single Puppeteer PDF option.
   *
   * @param key - Puppeteer PDFOptions key.
   * @param value - The value to set.
   */
  setOption(key: string, value: unknown): this {
    this.options[key] = value;
    return this;
  }

  /**
   * Merge multiple Puppeteer PDF options at once.
   *
   * @param opts - Partial Puppeteer PDFOptions object.
   */
  setOptions(opts: Record<string, unknown>): this {
    Object.assign(this.options, opts);
    return this;
  }

  /**
   * Set an HTML header template (displayed on every page).
   *
   * @param template - HTML string; may use Puppeteer's special classes
   *   (pageNumber, totalPages, date, title, url).
   * @param headerOptions - Additional header options such as height.
   */
  setHeader(template: string, headerOptions?: HeaderFooterOptions): this {
    this.options.headerTemplate = template;
    this.options.displayHeaderFooter = true;
    if (headerOptions?.height) {
      this.options.margin = {
        ...((this.options.margin as Record<string, string>) ?? {}),
        top: headerOptions.height,
      };
    }
    return this;
  }

  /**
   * Set an HTML footer template (displayed on every page).
   *
   * @param template - HTML string.
   * @param footerOptions - Additional footer options such as height.
   */
  setFooter(template: string, footerOptions?: HeaderFooterOptions): this {
    this.options.footerTemplate = template;
    this.options.displayHeaderFooter = true;
    if (footerOptions?.height) {
      this.options.margin = {
        ...((this.options.margin as Record<string, string>) ?? {}),
        bottom: footerOptions.height,
      };
    }
    return this;
  }

  /**
   * Inject additional CSS styles into the rendered HTML.
   *
   * @param css - CSS string to inject.
   */
  addStyles(css: string): this {
    if (!this.options.extraStyles) {
      this.options.extraStyles = [];
    }
    (this.options.extraStyles as string[]).push(css);
    return this;
  }

  /**
   * Add a diagonal watermark text to every page via injected CSS.
   *
   * @param text - The watermark text.
   * @param opts - Visual options (opacity, fontSize, rotation, color).
   */
  setWatermark(text: string, opts?: WatermarkOptions): this {
    this.options.watermark = { text, ...opts };
    return this;
  }

  /**
   * Set all four page margins at once.
   *
   * @param margins - Margin values (e.g. { top: '20mm', bottom: '20mm' }).
   */
  setMargins(margins: MarginOptions): this {
    this.options.margin = { ...(this.options.margin as MarginOptions | undefined), ...margins };
    return this;
  }

  /**
   * Set the Puppeteer viewport dimensions.
   *
   * @param options - Viewport width, height, and optional deviceScaleFactor.
   */
  setViewport(options: ViewportOptions): this {
    this.options.viewport = options;
    return this;
  }

  /**
   * Restrict printing to specific page ranges (e.g. '1-5, 8, 11-13').
   *
   * @param ranges - Puppeteer page ranges string.
   */
  setPageRanges(ranges: string): this {
    this.options.pageRanges = ranges;
    return this;
  }

  /**
   * Set the print scale factor (0.1–2.0).
   *
   * @param scale - Scale value. Default: 1.
   */
  setScale(scale: number): this {
    this.options.scale = scale;
    return this;
  }

  /**
   * Set the page background colour via injected CSS.
   *
   * @param color - Any valid CSS colour string (e.g. '#ffffff', 'white').
   */
  setBackground(color: string): this {
    this.options.background = color;
    return this;
  }

  /**
   * Inject additional JavaScript into the rendered page before PDF generation.
   *
   * @param script - JavaScript string to inject.
   */
  addScript(script: string): this {
    if (!this.options.extraScripts) {
      this.options.extraScripts = [];
    }
    (this.options.extraScripts as string[]).push(script);
    return this;
  }

  /**
   * Set document metadata (title, author, subject, keywords) via <meta> tags.
   *
   * @param metadata - Page metadata object.
   */
  setMetadata(metadata: PageMetadata): this {
    this.options.metadata = metadata;
    return this;
  }

  /**
   * Add a convenience footer with page numbers.
   * Overrides any previously set footer template.
   *
   * @param format - Template string. Use `{pageNumber}` and `{totalPages}` placeholders.
   *   Default: '{pageNumber} / {totalPages}'
   * @param footerOptions - Additional footer options.
   */
  addPageNumbers(format?: string, footerOptions?: HeaderFooterOptions): this {
    const tpl = (format ?? '{pageNumber} / {totalPages}')
      .replace('{pageNumber}', '<span class="pageNumber"></span>')
      .replace('{totalPages}', '<span class="totalPages"></span>');
    const footerHtml = `<div style="font-size:10px;text-align:center;width:100%;padding:4px 0">${tpl}</div>`;
    return this.setFooter(footerHtml, footerOptions);
  }

  // -------------------------------------------------------------------------
  // Output
  // -------------------------------------------------------------------------

  /**
   * Build and return the PDF.
   *
   * @param format - 'buffer' (default) or 'base64'.
   */
  async output(format?: 'buffer'): Promise<Buffer>;
  async output(format: 'base64'): Promise<string>;
  async output(format: PdfOutputFormat = 'buffer'): Promise<Buffer | string> {
    const buf = await this.generate();
    if (format === 'base64') {
      return buf.toString('base64');
    }
    return buf;
  }

  /**
   * Convenience alias — returns the PDF as a base64-encoded string.
   */
  async base64(): Promise<string> {
    return this.output('base64');
  }

  /**
   * Save the PDF to a file on disk.
   *
   * @param filePath - Absolute destination path.
   */
  async save(filePath: string): Promise<void> {
    const buf = await this.generate();
    await writeFile(filePath, buf);
  }

  /**
   * Send the PDF as a file download via an Express response.
   *
   * @param res - Express Response object.
   * @param filename - Suggested filename for the download.
   */
  async download(res: Response, filename: string): Promise<void> {
    const buf = await this.generate();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buf.length.toString());
    res.end(buf);
  }

  /**
   * Stream the PDF inline (display in browser) via an Express response.
   *
   * @param res - Express Response object.
   * @param filename - Filename hint for the Content-Disposition header.
   */
  async stream(res: Response, filename: string): Promise<void> {
    const buf = await this.generate();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buf.length.toString());
    res.end(buf);
  }

  /**
   * Capture a screenshot of the rendered HTML instead of a PDF.
   *
   * @param options - Screenshot options (type, quality, fullPage).
   */
  async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
    const html = this.buildHtml();
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      const vp = this.options.viewport as ViewportOptions | undefined;
      if (vp) {
        await page.setViewport({
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: vp.deviceScaleFactor ?? 1,
        });
      }
      await page.setContent(html, { waitUntil: 'load' });
      const result = await page.screenshot({
        type: options?.type ?? 'png',
        quality: options?.type === 'jpeg' || options?.type === 'webp' ? (options.quality ?? 90) : undefined,
        fullPage: options?.fullPage ?? false,
      });
      return Buffer.from(result);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate multiple PDFs in parallel and write them to disk.
   *
   * @param items - Array of `{ pdf, filePath }` pairs.
   */
  static async batch(
    items: Array<{ pdf: Pdf; filePath: string }>,
  ): Promise<void> {
    await Promise.all(items.map(({ pdf, filePath }) => pdf.save(filePath)));
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private buildHtml(): string {
    let html = this.html;

    const styles: string[] = [];
    const headExtras: string[] = [];

    // Background colour
    const bg = this.options.background as string | undefined;
    if (bg) {
      styles.push(`body { background-color: ${bg} !important; }`);
    }

    // Watermark
    const wm = this.options.watermark as ({ text: string } & WatermarkOptions) | undefined;
    if (wm) {
      const opacity = wm.opacity ?? 0.15;
      const fontSize = wm.fontSize ?? 60;
      const rotation = wm.rotation ?? -45;
      const color = wm.color ?? '#888888';
      styles.push(`
        body::after {
          content: "${wm.text}";
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${rotation}deg);
          font-size: ${fontSize}px;
          color: ${color};
          opacity: ${opacity};
          pointer-events: none;
          z-index: 9999;
          white-space: nowrap;
        }
      `);
    }

    // Extra styles
    const extra = this.options.extraStyles as string[] | undefined;
    if (extra) {
      styles.push(...extra);
    }

    if (styles.length > 0) {
      headExtras.push(`<style>${styles.join('\n')}</style>`);
    }

    // Metadata
    const meta = this.options.metadata as PageMetadata | undefined;
    if (meta) {
      if (meta.title) headExtras.push(`<title>${meta.title}</title>`);
      if (meta.author) headExtras.push(`<meta name="author" content="${meta.author}">`);
      if (meta.subject) headExtras.push(`<meta name="subject" content="${meta.subject}">`);
      if (meta.keywords) headExtras.push(`<meta name="keywords" content="${meta.keywords}">`);
      if (meta.creator) headExtras.push(`<meta name="generator" content="${meta.creator}">`);
    }

    if (headExtras.length > 0) {
      const injection = headExtras.join('\n');
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${injection}\n</head>`);
      } else {
        html = injection + '\n' + html;
      }
    }

    // Extra scripts (injected before </body>)
    const scripts = this.options.extraScripts as string[] | undefined;
    if (scripts && scripts.length > 0) {
      const scriptTags = scripts.map((s) => `<script>${s}</script>`).join('\n');
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTags}\n</body>`);
      } else {
        html = html + '\n' + scriptTags;
      }
    }

    return html;
  }

  private buildPuppeteerOptions(): Record<string, unknown> {
    const paper = this.options.paper as { size: PaperSize; orientation?: Orientation } | undefined;
    const size = paper?.size ?? 'a4';
    const isLandscape = (paper?.orientation ?? 'portrait') === 'landscape';
    const dims = PAPER_DIMENSIONS[size];

    const puppeteerOpts: Record<string, unknown> = {
      width: isLandscape ? dims.height : dims.width,
      height: isLandscape ? dims.width : dims.height,
      printBackground: (this.options.printBackground as boolean | undefined) ?? true,
      landscape: isLandscape,
    };

    if (this.options.margin) {
      puppeteerOpts['margin'] = this.options.margin;
    }

    if (this.options.scale !== undefined) {
      puppeteerOpts['scale'] = this.options.scale;
    }

    if (this.options.pageRanges) {
      puppeteerOpts['pageRanges'] = this.options.pageRanges;
    }

    if (this.options.displayHeaderFooter) {
      puppeteerOpts['displayHeaderFooter'] = true;
      puppeteerOpts['headerTemplate'] =
        (this.options.headerTemplate as string | undefined) ?? '<span></span>';
      puppeteerOpts['footerTemplate'] =
        (this.options.footerTemplate as string | undefined) ?? '<span></span>';
    }

    return puppeteerOpts;
  }

  private async generate(): Promise<Buffer> {
    const html = this.buildHtml();
    const pdfOpts = this.buildPuppeteerOptions();

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      const vp = this.options.viewport as ViewportOptions | undefined;
      if (vp) {
        await page.setViewport({
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: vp.deviceScaleFactor ?? 1,
        });
      }
      await page.setContent(html, { waitUntil: 'load' });
      const result = await page.pdf(pdfOpts as Parameters<typeof page.pdf>[0]);
      return Buffer.from(result);
    } finally {
      await page.close();
    }
  }
}

/**
 * `PDF` is the public façade — it is the `Pdf` class itself, so both
 * `new PDF(...)` and `PDF.loadHTML(...)` work seamlessly.
 */
export const PDF = Pdf;
export type PDF = Pdf;
