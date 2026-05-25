/**
 * Supported paper sizes for PDF generation.
 */
export type PaperSize = 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid';

/**
 * Page orientation.
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Output format for PDF.output().
 */
export type PdfOutputFormat = 'buffer' | 'base64';

/**
 * Paper configuration options.
 */
export interface PaperOptions {
  size: PaperSize;
  orientation?: Orientation;
}

/**
 * Options for header or footer templates.
 */
export interface HeaderFooterOptions {
  /** Height of the header/footer band, e.g. '20mm' */
  height?: string;
}

/**
 * Watermark configuration.
 */
export interface WatermarkOptions {
  opacity?: number;
  fontSize?: number;
  rotation?: number;
  color?: string;
}

/**
 * Margin options for all four sides.
 */
export interface MarginOptions {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

/**
 * Puppeteer viewport dimensions.
 */
export interface ViewportOptions {
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

/**
 * Document metadata injected as <meta> tags.
 */
export interface PageMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
}

/**
 * Options for Pdf.screenshot().
 */
export interface ScreenshotOptions {
  /** Output format. Default: 'png' */
  type?: 'png' | 'jpeg' | 'webp';
  /** JPEG/WebP quality (0-100). Only applies when type is 'jpeg' or 'webp'. */
  quality?: number;
  /** Whether to capture the full scrollable page. Default: false */
  fullPage?: boolean;
}

/**
 * Internal accumulated PDF options.
 */
export interface PdfOptions {
  paper?: PaperOptions;
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
  extraStyles?: string[];
  extraScripts?: string[];
  watermark?: { text: string } & WatermarkOptions;
  viewport?: ViewportOptions;
  pageRanges?: string;
  scale?: number;
  background?: string;
  metadata?: PageMetadata;
  /** Any additional Puppeteer PDFOptions fields */
  [key: string]: unknown;
}
