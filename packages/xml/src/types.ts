/**
 * Options for Xml.parse() and XmlParser.
 */
export interface XmlParseOptions {
  /** Prefix for attribute names. Default: '' */
  attributeNamePrefix?: string;
  /** Whether to ignore attributes entirely. Default: false */
  ignoreAttributes?: boolean;
  /** Whether to cast attribute values to primitive types. Default: false */
  parseAttributeValue?: boolean;
  /** Function that returns true when a tag name should always produce an array. */
  isArray?: (name: string, jpath: string, isLeaf: boolean, isAttribute: boolean) => boolean;
  /** Whether to trim text values. Default: true */
  trimValues?: boolean;
}

/**
 * Options for Xml.fromArray().
 */
export interface FromArrayOptions {
  /** Root element tag name. Default: 'items' */
  root?: string;
  /** Per-item element tag name. Default: 'item' */
  item?: string;
}

/**
 * Options for XmlBuilder.end().
 */
export interface EndOptions {
  /** Whether to pretty-print the XML with indentation. Default: false */
  prettyPrint?: boolean;
  /** Number of spaces per indent level (only when prettyPrint=true). Default: 2 */
  indent?: number;
}

/**
 * XML declaration options.
 */
export interface XmlDeclaration {
  version?: string;
  encoding?: string;
  standalone?: string;
}

/**
 * Result of Xml.validate().
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Options for Xml.prettyPrint().
 */
export interface PrettyPrintOptions {
  /** Spaces per indent level. Default: 2 */
  indent?: number;
}

/**
 * Options for Xml.toRss().
 */
export interface RssOptions {
  /** Feed title. */
  title: string;
  /** Feed link (URL). */
  link: string;
  /** Feed description. */
  description: string;
  /** Feed language (e.g. 'en-us'). */
  language?: string;
  /** Last build date (ISO string or Date). */
  lastBuildDate?: string | Date;
  /** Feed generator string. */
  generator?: string;
}

/**
 * A single RSS feed item.
 */
export interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string | Date;
  guid?: string;
  author?: string;
  category?: string | string[];
}

/**
 * Options for Xml.toAtom().
 */
export interface AtomOptions {
  /** Feed ID (IRI). */
  id: string;
  /** Feed title. */
  title: string;
  /** Last updated timestamp (ISO string or Date). */
  updated: string | Date;
  /** Author name. */
  authorName?: string;
  /** Feed URL. */
  link?: string;
}

/**
 * A single Atom feed entry.
 */
export interface AtomEntry {
  id: string;
  title: string;
  updated: string | Date;
  summary?: string;
  content?: string;
  link?: string;
  authorName?: string;
}

/**
 * A single sitemap URL entry.
 */
export interface SitemapUrl {
  loc: string;
  lastmod?: string | Date;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Options for Xml.toSitemap().
 */
export interface SitemapOptions {
  /** Whether to pretty-print the output. Default: false */
  prettyPrint?: boolean;
}
