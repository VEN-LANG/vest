import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist all mock primitives so vi.mock factories can reference them
// ---------------------------------------------------------------------------

const {
  mockPdfFn,
  mockGetContentFn,
  mockSetContentFn,
  mockGotoFn,
  mockPageCloseFn,
  mockBrowserCloseFn,
  mockSetViewportFn,
  mockScreenshotFn,
  mockPage,
  mockBrowser,
  mockReadFile,
  mockWriteFile,
} = vi.hoisted(() => {
  const mockPdfFn = vi.fn().mockResolvedValue(Buffer.from('%PDF-mock'));
  const mockGetContentFn = vi.fn().mockResolvedValue('<html><body>mocked</body></html>');
  const mockSetContentFn = vi.fn().mockResolvedValue(undefined);
  const mockGotoFn = vi.fn().mockResolvedValue(undefined);
  const mockPageCloseFn = vi.fn().mockResolvedValue(undefined);
  const mockBrowserCloseFn = vi.fn().mockResolvedValue(undefined);
  const mockSetViewportFn = vi.fn().mockResolvedValue(undefined);
  const mockScreenshotFn = vi.fn().mockResolvedValue(Buffer.from('PNG-mock'));

  const mockPage = {
    setContent: mockSetContentFn,
    pdf: mockPdfFn,
    close: mockPageCloseFn,
    content: mockGetContentFn,
    goto: mockGotoFn,
    setViewport: mockSetViewportFn,
    screenshot: mockScreenshotFn,
  };

  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: mockBrowserCloseFn,
  };

  const mockReadFile = vi.fn();
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);

  return {
    mockPdfFn,
    mockGetContentFn,
    mockSetContentFn,
    mockGotoFn,
    mockPageCloseFn,
    mockBrowserCloseFn,
    mockSetViewportFn,
    mockScreenshotFn,
    mockPage,
    mockBrowser,
    mockReadFile,
    mockWriteFile,
  };
});

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks are set up
// ---------------------------------------------------------------------------

import { Pdf, PDF } from '../Pdf.js';

describe('@lara-node/pdf — Pdf class', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfFn.mockResolvedValue(Buffer.from('%PDF-mock'));
    mockScreenshotFn.mockResolvedValue(Buffer.from('PNG-mock'));
    mockBrowser.newPage.mockResolvedValue(mockPage);
  });

  afterEach(async () => {
    // Reset singleton after each test
    await Pdf.closeBrowser();
  });

  // -------------------------------------------------------------------------
  // Static factories
  // -------------------------------------------------------------------------

  describe('loadHTML', () => {
    it('creates a Pdf instance from an HTML string', async () => {
      const pdf = Pdf.loadHTML('<h1>Hello</h1>');
      expect(pdf).toBeInstanceOf(Pdf);
    });

    it('interpolates {{ variables }} in the HTML', async () => {
      const pdf = Pdf.loadHTML('<h1>Hello {{name}}</h1>', { name: 'Alice' });
      const buf = await pdf.output();
      expect(mockSetContentFn).toHaveBeenCalledWith(
        expect.stringContaining('Hello Alice'),
        expect.any(Object),
      );
      expect(buf).toBeInstanceOf(Buffer);
    });

    it('leaves unknown placeholders as empty string', async () => {
      const pdf = Pdf.loadHTML('<p>{{missing}}</p>');
      await pdf.output();
      expect(mockSetContentFn).toHaveBeenCalledWith(
        expect.stringContaining('<p></p>'),
        expect.any(Object),
      );
    });

    it('works without data argument', async () => {
      const pdf = Pdf.loadHTML('<p>No vars</p>');
      await expect(pdf.output()).resolves.toBeInstanceOf(Buffer);
    });
  });

  describe('loadView', () => {
    it('reads a file and interpolates variables', async () => {
      mockReadFile.mockResolvedValueOnce('<h1>{{title}}</h1>');
      const pdf = await Pdf.loadView('/views/page.html', { title: 'Test' });
      await pdf.output();
      expect(mockReadFile).toHaveBeenCalledWith('/views/page.html', 'utf-8');
      expect(mockSetContentFn).toHaveBeenCalledWith(
        expect.stringContaining('<h1>Test</h1>'),
        expect.any(Object),
      );
    });

    it('reads a file without data', async () => {
      mockReadFile.mockResolvedValueOnce('<p>Static</p>');
      const pdf = await Pdf.loadView('/views/static.html');
      expect(pdf).toBeInstanceOf(Pdf);
    });
  });

  describe('loadFile', () => {
    it('reads a file with no interpolation', async () => {
      mockReadFile.mockResolvedValueOnce('<p>Raw {{kept}}</p>');
      const pdf = await Pdf.loadFile('/templates/raw.html');
      await pdf.output();
      expect(mockSetContentFn).toHaveBeenCalledWith(
        expect.stringContaining('{{kept}}'),
        expect.any(Object),
      );
    });
  });

  describe('loadUrl', () => {
    it('navigates to the URL and captures page content', async () => {
      const pdf = await Pdf.loadUrl('https://example.com');
      await pdf.output();
      expect(mockGotoFn).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle0' });
      expect(mockGetContentFn).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Fluent configuration
  // -------------------------------------------------------------------------

  describe('setPaper', () => {
    it.each([
      ['a4', '210mm', '297mm'],
      ['a3', '297mm', '420mm'],
      ['a5', '148mm', '210mm'],
      ['letter', '216mm', '279mm'],
      ['legal', '216mm', '356mm'],
      ['tabloid', '279mm', '432mm'],
    ] as const)('sets %s paper size correctly', async (size, w, h) => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setPaper(size).output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['width']).toBe(w);
      expect(call['height']).toBe(h);
    });

    it('sets landscape orientation by swapping dimensions', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setPaper('a4', 'landscape').output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['width']).toBe('297mm');
      expect(call['height']).toBe('210mm');
      expect(call['landscape']).toBe(true);
    });
  });

  describe('setOrientation', () => {
    it('sets orientation on existing paper config', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setPaper('a4').setOrientation('landscape').output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['landscape']).toBe(true);
    });

    it('defaults to a4 when no paper has been set', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setOrientation('landscape').output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['landscape']).toBe(true);
    });
  });

  describe('setOption / setOptions', () => {
    it('passes arbitrary options to puppeteer', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf
        .setOption('printBackground', true)
        .setOptions({ margin: { top: '20mm', bottom: '20mm' } })
        .output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['margin']).toEqual({ top: '20mm', bottom: '20mm' });
    });
  });

  // -------------------------------------------------------------------------
  // Header / Footer
  // -------------------------------------------------------------------------

  describe('setHeader / setFooter', () => {
    it('enables displayHeaderFooter and passes templates', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf
        .setHeader('<div>Header</div>', { height: '20mm' })
        .setFooter('<div>Footer</div>', { height: '15mm' })
        .output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['displayHeaderFooter']).toBe(true);
      expect(call['headerTemplate']).toBe('<div>Header</div>');
      expect(call['footerTemplate']).toBe('<div>Footer</div>');
    });

    it('sets top margin from header height', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setHeader('<div>H</div>', { height: '25mm' }).output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect((call['margin'] as Record<string, string>)['top']).toBe('25mm');
    });
  });

  // -------------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------------

  describe('addStyles', () => {
    it('injects a <style> tag into the HTML', async () => {
      const pdf = Pdf.loadHTML('<html><head></head><body><p>test</p></body></html>');
      await pdf.addStyles('body { color: red; }').output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('body { color: red; }');
      expect(call).toContain('<style>');
    });

    it('prepends style when no </head> tag exists', async () => {
      const pdf = Pdf.loadHTML('<p>bare html</p>');
      await pdf.addStyles('p { margin: 0; }').output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('<style>');
    });
  });

  // -------------------------------------------------------------------------
  // Watermark
  // -------------------------------------------------------------------------

  describe('setWatermark', () => {
    it('injects watermark CSS with the provided text', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setWatermark('DRAFT', { opacity: 0.2, fontSize: 72, rotation: -30, color: '#ccc' }).output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('"DRAFT"');
      expect(call).toContain('opacity: 0.2');
      expect(call).toContain('font-size: 72px');
      expect(call).toContain('rotate(-30deg)');
      expect(call).toContain('color: #ccc');
    });

    it('uses sensible defaults when no options are given', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setWatermark('CONFIDENTIAL').output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('opacity: 0.15');
      expect(call).toContain('font-size: 60px');
      expect(call).toContain('rotate(-45deg)');
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Margins
  // -------------------------------------------------------------------------

  describe('setMargins', () => {
    it('passes all four margins to puppeteer', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf
        .setMargins({ top: '10mm', right: '15mm', bottom: '10mm', left: '15mm' })
        .output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['margin']).toEqual({
        top: '10mm',
        right: '15mm',
        bottom: '10mm',
        left: '15mm',
      });
    });

    it('merges with existing margin set by setHeader', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf
        .setHeader('<div>H</div>', { height: '20mm' })
        .setMargins({ bottom: '10mm' })
        .output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect((call['margin'] as Record<string, string>)['top']).toBe('20mm');
      expect((call['margin'] as Record<string, string>)['bottom']).toBe('10mm');
    });

    it('returns the Pdf instance for chaining', () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      expect(pdf.setMargins({ top: '10mm' })).toBe(pdf);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Viewport
  // -------------------------------------------------------------------------

  describe('setViewport', () => {
    it('calls page.setViewport with the provided dimensions', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setViewport({ width: 1920, height: 1080 }).output();
      expect(mockSetViewportFn).toHaveBeenCalledWith({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });
    });

    it('passes deviceScaleFactor when provided', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 }).output();
      expect(mockSetViewportFn).toHaveBeenCalledWith({
        width: 1280,
        height: 720,
        deviceScaleFactor: 2,
      });
    });

    it('does not call setViewport when not configured', async () => {
      await Pdf.loadHTML('<p>test</p>').output();
      expect(mockSetViewportFn).not.toHaveBeenCalled();
    });

    it('returns the Pdf instance for chaining', () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      expect(pdf.setViewport({ width: 1280, height: 720 })).toBe(pdf);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Page ranges
  // -------------------------------------------------------------------------

  describe('setPageRanges', () => {
    it('passes pageRanges to puppeteer', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setPageRanges('1-3, 5').output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['pageRanges']).toBe('1-3, 5');
    });

    it('does not include pageRanges when not set', async () => {
      await Pdf.loadHTML('<p>test</p>').output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call).not.toHaveProperty('pageRanges');
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Scale
  // -------------------------------------------------------------------------

  describe('setScale', () => {
    it('passes scale to puppeteer', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setScale(0.75).output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['scale']).toBe(0.75);
    });

    it('does not include scale key when not set', async () => {
      await Pdf.loadHTML('<p>test</p>').output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call).not.toHaveProperty('scale');
    });

    it('returns the Pdf instance for chaining', () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      expect(pdf.setScale(1)).toBe(pdf);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Background
  // -------------------------------------------------------------------------

  describe('setBackground', () => {
    it('injects background-color CSS into the HTML', async () => {
      const pdf = Pdf.loadHTML('<html><head></head><body></body></html>');
      await pdf.setBackground('#f0f0f0').output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('background-color: #f0f0f0');
    });

    it('works on bare HTML without head/body tags', async () => {
      const pdf = Pdf.loadHTML('<p>bare</p>');
      await pdf.setBackground('white').output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('background-color: white');
    });

    it('returns the Pdf instance for chaining', () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      expect(pdf.setBackground('#fff')).toBe(pdf);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Scripts
  // -------------------------------------------------------------------------

  describe('addScript', () => {
    it('injects a <script> tag before </body>', async () => {
      const pdf = Pdf.loadHTML('<html><body><p>test</p></body></html>');
      await pdf.addScript('console.log("hello")').output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('<script>console.log("hello")</script>');
    });

    it('appends script after body content when no </body> tag', async () => {
      const pdf = Pdf.loadHTML('<p>bare</p>');
      await pdf.addScript('window.x = 1').output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('<script>window.x = 1</script>');
    });

    it('chains multiple scripts and injects all', async () => {
      const pdf = Pdf.loadHTML('<html><body></body></html>');
      await pdf.addScript('var a = 1').addScript('var b = 2').output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('<script>var a = 1</script>');
      expect(call).toContain('<script>var b = 2</script>');
    });

    it('returns the Pdf instance for chaining', () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      expect(pdf.addScript('var x = 1')).toBe(pdf);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Metadata
  // -------------------------------------------------------------------------

  describe('setMetadata', () => {
    it('injects title and meta tags into the HTML head', async () => {
      const pdf = Pdf.loadHTML('<html><head></head><body></body></html>');
      await pdf
        .setMetadata({
          title: 'Annual Report',
          author: 'Alice',
          subject: 'Finance',
          keywords: 'finance, Q4',
        })
        .output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('<title>Annual Report</title>');
      expect(call).toContain('name="author" content="Alice"');
      expect(call).toContain('name="subject" content="Finance"');
      expect(call).toContain('name="keywords" content="finance, Q4"');
    });

    it('prepends metadata when no </head> tag exists', async () => {
      const pdf = Pdf.loadHTML('<p>bare</p>');
      await pdf.setMetadata({ title: 'Test' }).output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('<title>Test</title>');
    });

    it('injects creator as a generator meta tag', async () => {
      const pdf = Pdf.loadHTML('<html><head></head></html>');
      await pdf.setMetadata({ creator: 'Lara-Node' }).output();
      const call = mockSetContentFn.mock.calls[0][0] as string;
      expect(call).toContain('name="generator" content="Lara-Node"');
    });

    it('returns the Pdf instance for chaining', () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      expect(pdf.setMetadata({ title: 'Test' })).toBe(pdf);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Page numbers
  // -------------------------------------------------------------------------

  describe('addPageNumbers', () => {
    it('sets footer with default page number format', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.addPageNumbers().output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect(call['displayHeaderFooter']).toBe(true);
      const footer = call['footerTemplate'] as string;
      expect(footer).toContain('class="pageNumber"');
      expect(footer).toContain('class="totalPages"');
    });

    it('uses a custom format string with placeholders', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.addPageNumbers('Page {pageNumber} of {totalPages}').output();
      const footer = (mockPdfFn.mock.calls[0][0] as Record<string, unknown>)[
        'footerTemplate'
      ] as string;
      expect(footer).toContain('class="pageNumber"');
      expect(footer).toContain('class="totalPages"');
    });

    it('accepts a footerOptions height parameter', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.addPageNumbers(undefined, { height: '15mm' }).output();
      const call = mockPdfFn.mock.calls[0][0] as Record<string, unknown>;
      expect((call['margin'] as Record<string, string>)['bottom']).toBe('15mm');
    });

    it('returns the Pdf instance for chaining', () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      expect(pdf.addPageNumbers()).toBe(pdf);
    });
  });

  // -------------------------------------------------------------------------
  // Output formats
  // -------------------------------------------------------------------------

  describe('output', () => {
    it('returns Buffer by default', async () => {
      const pdf = Pdf.loadHTML('<p>hi</p>');
      const result = await pdf.output();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('returns Buffer when format is "buffer"', async () => {
      const pdf = Pdf.loadHTML('<p>hi</p>');
      const result = await pdf.output('buffer');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('returns base64 string when format is "base64"', async () => {
      const pdf = Pdf.loadHTML('<p>hi</p>');
      const result = await pdf.output('base64');
      expect(typeof result).toBe('string');
      const decoded = Buffer.from(result, 'base64');
      expect(decoded.toString()).toBe('%PDF-mock');
    });
  });

  describe('base64', () => {
    it('is a convenience alias for output("base64")', async () => {
      const pdf = Pdf.loadHTML('<p>hi</p>');
      const result = await pdf.base64();
      expect(typeof result).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // save
  // -------------------------------------------------------------------------

  describe('save', () => {
    it('writes the PDF buffer to disk', async () => {
      const pdf = Pdf.loadHTML('<p>hi</p>');
      await pdf.save('/tmp/out.pdf');
      expect(mockWriteFile).toHaveBeenCalledWith('/tmp/out.pdf', expect.any(Buffer));
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Screenshot
  // -------------------------------------------------------------------------

  describe('screenshot', () => {
    it('calls page.screenshot() and returns a Buffer', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      const result = await pdf.screenshot();
      expect(mockScreenshotFn).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('defaults to png type', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.screenshot();
      expect(mockScreenshotFn).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'png' }),
      );
    });

    it('passes type and quality for jpeg', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.screenshot({ type: 'jpeg', quality: 80 });
      expect(mockScreenshotFn).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'jpeg', quality: 80 }),
      );
    });

    it('passes the fullPage option', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.screenshot({ fullPage: true });
      expect(mockScreenshotFn).toHaveBeenCalledWith(
        expect.objectContaining({ fullPage: true }),
      );
    });

    it('sets viewport before capturing when configured', async () => {
      const pdf = Pdf.loadHTML('<p>test</p>');
      await pdf.setViewport({ width: 1280, height: 720 }).screenshot();
      expect(mockSetViewportFn).toHaveBeenCalledWith({
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
      });
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — Batch generation
  // -------------------------------------------------------------------------

  describe('PDF.batch', () => {
    it('generates multiple PDFs and writes each to disk', async () => {
      const items = [
        { pdf: Pdf.loadHTML('<p>Doc 1</p>'), filePath: '/tmp/doc1.pdf' },
        { pdf: Pdf.loadHTML('<p>Doc 2</p>'), filePath: '/tmp/doc2.pdf' },
      ];
      await PDF.batch(items);
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      expect(mockWriteFile).toHaveBeenCalledWith('/tmp/doc1.pdf', expect.any(Buffer));
      expect(mockWriteFile).toHaveBeenCalledWith('/tmp/doc2.pdf', expect.any(Buffer));
    });

    it('handles an empty items array without error', async () => {
      await expect(PDF.batch([])).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Express integration
  // -------------------------------------------------------------------------

  describe('download', () => {
    it('sets correct response headers and ends with buffer', async () => {
      const res = {
        setHeader: vi.fn(),
        end: vi.fn(),
      };
      const pdf = Pdf.loadHTML('<p>hi</p>');
      await pdf.download(res as unknown as import('express').Response, 'report.pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="report.pdf"',
      );
      expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('stream', () => {
    it('sets Content-Disposition inline and ends with buffer', async () => {
      const res = {
        setHeader: vi.fn(),
        end: vi.fn(),
      };
      const pdf = Pdf.loadHTML('<p>hi</p>');
      await pdf.stream(res as unknown as import('express').Response, 'report.pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'inline; filename="report.pdf"',
      );
      expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  // -------------------------------------------------------------------------
  // PDF export alias
  // -------------------------------------------------------------------------

  describe('PDF namespace export', () => {
    it('PDF is the same as Pdf class', () => {
      expect(PDF).toBe(Pdf);
    });

    it('PDF.loadHTML returns a Pdf instance', () => {
      const pdf = PDF.loadHTML('<p>test</p>');
      expect(pdf).toBeInstanceOf(Pdf);
    });
  });

  // -------------------------------------------------------------------------
  // Browser lifecycle
  // -------------------------------------------------------------------------

  describe('closeBrowser', () => {
    it('calls browser.close() and resets the singleton', async () => {
      // Trigger browser creation
      await Pdf.loadHTML('<p>x</p>').output();
      await Pdf.closeBrowser();
      expect(mockBrowserCloseFn).toHaveBeenCalled();
    });

    it('is a no-op if browser was never launched', async () => {
      // closeBrowser was already called in afterEach, so this should not throw
      await expect(Pdf.closeBrowser()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Fluent chaining
  // -------------------------------------------------------------------------

  describe('fluent chaining', () => {
    it('all setters return the Pdf instance for chaining', () => {
      const pdf = Pdf.loadHTML('<p>chain</p>');
      const result = pdf
        .setPaper('a4')
        .setOrientation('landscape')
        .setOption('printBackground', true)
        .setOptions({ margin: { top: '10mm' } })
        .setHeader('<div>H</div>')
        .setFooter('<div>F</div>')
        .addStyles('body{}')
        .setWatermark('DRAFT')
        .setMargins({ top: '10mm', bottom: '10mm' })
        .setViewport({ width: 1280, height: 720 })
        .setPageRanges('1-5')
        .setScale(1)
        .setBackground('#ffffff')
        .addScript('var x = 1')
        .setMetadata({ title: 'Test', author: 'Alice' })
        .addPageNumbers('{pageNumber} / {totalPages}');
      expect(result).toBe(pdf);
    });
  });
});
