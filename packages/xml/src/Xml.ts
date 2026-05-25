import type { Response } from 'express';
import { XmlBuilder } from './XmlBuilder.js';
import { XmlParser } from './XmlParser.js';
import {
  fromObject as serFromObject,
  fromArray as serFromArray,
  prettyPrint as serPrettyPrint,
  compact as serCompact,
  escape as serEscape,
  unescape as serUnescape,
  validate as serValidate,
} from './serializer.js';
import type {
  XmlParseOptions,
  FromArrayOptions,
  EndOptions,
  XmlDeclaration,
  ValidationResult,
  PrettyPrintOptions,
  RssOptions,
  RssItem,
  AtomOptions,
  AtomEntry,
  SitemapUrl,
  SitemapOptions,
} from './types.js';

/**
 * Main Xml facade — static methods for building, parsing, and responding with XML.
 */
export class Xml {
  // -------------------------------------------------------------------------
  // Builder factory
  // -------------------------------------------------------------------------

  /**
   * Create a new XmlBuilder rooted at the given tag.
   *
   * @param rootTag - Name of the root XML element.
   * @param declaration - Optional XML declaration options.
   */
  static create(rootTag: string, declaration?: XmlDeclaration): XmlBuilder {
    return new XmlBuilder(rootTag, declaration);
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  /**
   * Serialize a JavaScript object to an XML string.
   *
   * @param obj - Object to serialize.
   * @param rootTag - Root element tag name.
   */
  static fromObject(obj: Record<string, unknown>, rootTag: string): string {
    return serFromObject(obj, rootTag);
  }

  /**
   * Serialize an array of objects to XML.
   *
   * @param arr - Array of objects.
   * @param options - Root and item tag names.
   */
  static fromArray(arr: Record<string, unknown>[], options?: FromArrayOptions): string {
    return serFromArray(arr, options);
  }

  // -------------------------------------------------------------------------
  // Parsing
  // -------------------------------------------------------------------------

  /**
   * Parse an XML string into a JavaScript object.
   *
   * @param xml - XML string to parse.
   * @param options - Parser options.
   */
  static parse(xml: string, options?: XmlParseOptions): Record<string, unknown> {
    const parser = new XmlParser(options);
    return parser.parse(xml);
  }

  /**
   * Get a nested value from a parsed object using dot-notation.
   *
   * @param obj - Parsed XML object.
   * @param path - Dot-notation path (e.g., 'users.user.0.name').
   */
  static get(obj: Record<string, unknown>, path: string): unknown {
    const parser = new XmlParser();
    return parser.get(obj, path);
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  /**
   * Check XML string well-formedness.
   *
   * @param xml - XML string to validate.
   */
  static validate(xml: string): ValidationResult {
    return serValidate(xml);
  }

  /**
   * Escape XML special characters.
   */
  static escape(str: string): string {
    return serEscape(str);
  }

  /**
   * Unescape XML entity references.
   */
  static unescape(str: string): string {
    return serUnescape(str);
  }

  /**
   * Pretty-print an XML string.
   *
   * @param xml - XML string to format.
   * @param options - Pretty-print options.
   */
  static prettyPrint(xml: string, options?: PrettyPrintOptions): string {
    return serPrettyPrint(xml, options);
  }

  /**
   * Compact an XML string by stripping whitespace and indentation.
   *
   * @param xml - XML string to compact.
   */
  static compact(xml: string): string {
    return serCompact(xml);
  }

  /**
   * Convert an XML string to a JSON string.
   *
   * @param xml - XML string to convert.
   * @param options - Parser options.
   */
  static toJson(xml: string, options?: XmlParseOptions): string {
    const parsed = Xml.parse(xml, options);
    return JSON.stringify(parsed);
  }

  // -------------------------------------------------------------------------
  // Express response helpers
  // -------------------------------------------------------------------------

  /**
   * Send an XML response via Express.
   *
   * @param res - Express Response object.
   * @param xml - XML string to send.
   */
  static response(res: Response, xml: string): void {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(xml, 'utf-8').toString());
    res.end(xml);
  }

  /**
   * Send an XML string as a file download.
   *
   * @param res - Express Response object.
   * @param xml - XML string to send.
   * @param filename - Suggested filename.
   */
  static download(res: Response, xml: string, filename: string): void {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(xml, 'utf-8').toString());
    res.end(xml);
  }

  /**
   * Parse an XML string and send the result as a JSON response.
   *
   * @param res - Express Response object.
   * @param xml - XML string to parse and send.
   * @param options - Parser options.
   */
  static jsonResponse(res: Response, xml: string, options?: XmlParseOptions): void {
    const json = Xml.toJson(xml, options);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(json);
  }

  // -------------------------------------------------------------------------
  // Parsing helpers
  // -------------------------------------------------------------------------

  /**
   * Find the first element matching a tag name in a parsed XML object.
   *
   * @param obj - Parsed XML object.
   * @param tag - Tag name to search for.
   */
  static find(obj: Record<string, unknown>, tag: string): unknown {
    return new XmlParser().find(obj, tag);
  }

  /**
   * Find all elements matching a tag name in a parsed XML object.
   *
   * @param obj - Parsed XML object.
   * @param tag - Tag name to search for.
   */
  static findAll(obj: Record<string, unknown>, tag: string): unknown[] {
    return new XmlParser().findAll(obj, tag);
  }

  // -------------------------------------------------------------------------
  // Transformation utilities
  // -------------------------------------------------------------------------

  /**
   * Convert a JSON string to XML.
   *
   * @param json - JSON string to convert.
   * @param rootTag - Root element tag name. Default: 'root'.
   */
  static fromJson(json: string, rootTag = 'root'): string {
    const obj = JSON.parse(json) as Record<string, unknown>;
    return serFromObject(obj, rootTag);
  }

  /**
   * Transform each element of a parsed XML collection using a mapping function.
   * Parses the XML, extracts `itemTag` elements, maps them, and re-serializes.
   *
   * @param xml - XML string to transform.
   * @param itemTag - Tag name of the collection items.
   * @param transform - Mapping function.
   * @param rootTag - Root element tag for output. Default: 'items'.
   * @param options - Parser options.
   */
  static transform(
    xml: string,
    itemTag: string,
    transform: (item: Record<string, unknown>, index: number) => Record<string, unknown>,
    rootTag = 'items',
    options?: XmlParseOptions,
  ): string {
    const parsed = Xml.parse(xml, options);
    const parser = new XmlParser(options);
    const items = parser.findAll(parsed, itemTag) as Record<string, unknown>[];
    const mapped = items.map(transform);
    return serFromArray(mapped, { root: rootTag, item: itemTag });
  }

  /**
   * Merge two XML strings by combining their children under a shared root.
   *
   * @param xmlA - First XML string.
   * @param xmlB - Second XML string.
   * @param rootTag - Root tag for the merged output. Default: 'merged'.
   * @param options - Parser options.
   */
  static merge(
    xmlA: string,
    xmlB: string,
    rootTag = 'merged',
    options?: XmlParseOptions,
  ): string {
    const a = Xml.parse(xmlA, options);
    const b = Xml.parse(xmlB, options);
    const merged: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(a)) {
      if (k in merged) {
        const existing = merged[k];
        merged[k] = Array.isArray(existing)
          ? [...existing, ...(Array.isArray(v) ? v : [v])]
          : [existing, ...(Array.isArray(v) ? v : [v])];
      } else {
        merged[k] = v;
      }
    }
    for (const [k, v] of Object.entries(b)) {
      if (k in merged) {
        const existing = merged[k];
        merged[k] = Array.isArray(existing)
          ? [...existing, ...(Array.isArray(v) ? v : [v])]
          : [existing, ...(Array.isArray(v) ? v : [v])];
      } else {
        merged[k] = v;
      }
    }
    return serFromObject(merged, rootTag);
  }

  /**
   * Strip all XML tags from a string, returning the plain text content.
   *
   * @param xml - XML string to strip.
   */
  static strip(xml: string): string {
    return xml
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (m) =>
        m.slice(9, m.length - 3),
      )
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  // -------------------------------------------------------------------------
  // Feed generators
  // -------------------------------------------------------------------------

  /**
   * Generate an RSS 2.0 feed XML string.
   *
   * @param channel - Feed channel options.
   * @param items - Array of feed items.
   */
  static toRss(channel: RssOptions, items: RssItem[]): string {
    const fmt = (d: string | Date | undefined) =>
      d ? new Date(d).toUTCString() : '';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rss version="2.0">\n<channel>\n`;
    xml += `  <title>${serEscape(channel.title)}</title>\n`;
    xml += `  <link>${serEscape(channel.link)}</link>\n`;
    xml += `  <description>${serEscape(channel.description)}</description>\n`;
    if (channel.language) xml += `  <language>${channel.language}</language>\n`;
    if (channel.lastBuildDate) xml += `  <lastBuildDate>${fmt(channel.lastBuildDate)}</lastBuildDate>\n`;
    if (channel.generator) xml += `  <generator>${serEscape(channel.generator)}</generator>\n`;

    for (const item of items) {
      xml += `  <item>\n`;
      xml += `    <title>${serEscape(item.title)}</title>\n`;
      xml += `    <link>${serEscape(item.link)}</link>\n`;
      if (item.description) xml += `    <description>${serEscape(item.description)}</description>\n`;
      if (item.pubDate) xml += `    <pubDate>${fmt(item.pubDate)}</pubDate>\n`;
      if (item.author) xml += `    <author>${serEscape(item.author)}</author>\n`;
      const guid = item.guid ?? item.link;
      xml += `    <guid>${serEscape(guid)}</guid>\n`;
      const cats = Array.isArray(item.category)
        ? item.category
        : item.category
          ? [item.category]
          : [];
      for (const cat of cats) {
        xml += `    <category>${serEscape(cat)}</category>\n`;
      }
      xml += `  </item>\n`;
    }

    xml += `</channel>\n</rss>`;
    return xml;
  }

  /**
   * Generate an Atom 1.0 feed XML string.
   *
   * @param feed - Feed options.
   * @param entries - Array of feed entries.
   */
  static toAtom(feed: AtomOptions, entries: AtomEntry[]): string {
    const fmt = (d: string | Date) => new Date(d).toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<feed xmlns="http://www.w3.org/2005/Atom">\n`;
    xml += `  <id>${serEscape(feed.id)}</id>\n`;
    xml += `  <title>${serEscape(feed.title)}</title>\n`;
    xml += `  <updated>${fmt(feed.updated)}</updated>\n`;
    if (feed.link) xml += `  <link href="${serEscape(feed.link)}" rel="alternate"/>\n`;
    if (feed.authorName) xml += `  <author><name>${serEscape(feed.authorName)}</name></author>\n`;

    for (const entry of entries) {
      xml += `  <entry>\n`;
      xml += `    <id>${serEscape(entry.id)}</id>\n`;
      xml += `    <title>${serEscape(entry.title)}</title>\n`;
      xml += `    <updated>${fmt(entry.updated)}</updated>\n`;
      if (entry.link) xml += `    <link href="${serEscape(entry.link)}"/>\n`;
      if (entry.authorName) xml += `    <author><name>${serEscape(entry.authorName)}</name></author>\n`;
      if (entry.summary) xml += `    <summary>${serEscape(entry.summary)}</summary>\n`;
      if (entry.content) xml += `    <content type="html">${serEscape(entry.content)}</content>\n`;
      xml += `  </entry>\n`;
    }

    xml += `</feed>`;
    return xml;
  }

  /**
   * Generate a sitemap.xml string.
   *
   * @param urls - Array of URL entries.
   * @param options - Sitemap generation options.
   */
  static toSitemap(urls: SitemapUrl[], options?: SitemapOptions): string {
    const fmt = (d: string | Date | undefined) =>
      d ? new Date(d).toISOString().split('T')[0] : undefined;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const u of urls) {
      xml += `  <url>\n`;
      xml += `    <loc>${serEscape(u.loc)}</loc>\n`;
      const lastmod = fmt(u.lastmod);
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      if (u.changefreq) xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
      if (u.priority !== undefined) xml += `    <priority>${u.priority.toFixed(1)}</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;
    return options?.prettyPrint ? xml : serCompact(xml);
  }
}
