import { XMLParser } from 'fast-xml-parser';
import type { XmlParseOptions } from './types.js';

/**
 * Wraps fast-xml-parser with sensible defaults and a dot-notation path accessor.
 */
export class XmlParser {
  private options: XmlParseOptions;

  constructor(options: XmlParseOptions = {}) {
    this.options = options;
  }

  /**
   * Parse an XML string into a JavaScript object.
   *
   * @param xml - XML string to parse.
   */
  parse(xml: string): Record<string, unknown> {
    const parserOptions: Record<string, unknown> = {
      attributeNamePrefix: this.options.attributeNamePrefix ?? '',
      ignoreAttributes: this.options.ignoreAttributes ?? false,
      parseAttributeValue: this.options.parseAttributeValue ?? false,
      trimValues: this.options.trimValues !== false,
    };

    if (this.options.isArray) {
      parserOptions['isArray'] = this.options.isArray;
    }

    const parser = new XMLParser(parserOptions as ConstructorParameters<typeof XMLParser>[0]);
    return parser.parse(xml) as Record<string, unknown>;
  }

  /**
   * Get a nested value from a parsed object using dot notation.
   * Array indices are also supported (e.g., 'users.user.0.name').
   *
   * @param obj - Parsed XML object.
   * @param path - Dot-notation path string.
   */
  get(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Find the first value matching a tag name anywhere in the parsed object tree.
   *
   * @param obj - Parsed XML object.
   * @param tag - Tag name to search for.
   */
  find(obj: Record<string, unknown>, tag: string): unknown {
    if (tag in obj) return obj[tag];
    for (const val of Object.values(obj)) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const found = this.find(val as Record<string, unknown>, tag);
        if (found !== undefined) return found;
      }
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item !== null && typeof item === 'object') {
            const found = this.find(item as Record<string, unknown>, tag);
            if (found !== undefined) return found;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Find all values matching a tag name anywhere in the parsed object tree.
   *
   * @param obj - Parsed XML object.
   * @param tag - Tag name to search for.
   */
  findAll(obj: Record<string, unknown>, tag: string): unknown[] {
    const results: unknown[] = [];
    this.collectAll(obj, tag, results);
    return results;
  }

  private collectAll(obj: Record<string, unknown>, tag: string, results: unknown[]): void {
    for (const [key, val] of Object.entries(obj)) {
      if (key === tag) {
        if (Array.isArray(val)) {
          results.push(...val);
        } else {
          results.push(val);
        }
      }
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        this.collectAll(val as Record<string, unknown>, tag, results);
      }
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item !== null && typeof item === 'object') {
            this.collectAll(item as Record<string, unknown>, tag, results);
          }
        }
      }
    }
  }
}
