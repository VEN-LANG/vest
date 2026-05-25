import { XmlBuilder } from './XmlBuilder.js';
import { XmlParser } from './XmlParser.js';
import type { FromArrayOptions, PrettyPrintOptions, ValidationResult } from './types.js';

const XML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

const XML_UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

/**
 * Escape XML special characters in a string.
 */
export function escape(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => XML_ESCAPE_MAP[ch] ?? ch);
}

/**
 * Unescape XML entity references in a string.
 */
export function unescape(str: string): string {
  return str.replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) =>
    XML_UNESCAPE_MAP[entity] ?? entity,
  );
}

/**
 * Serialize a plain JavaScript object to XML.
 *
 * @param obj - The object to serialize.
 * @param rootTag - Name of the root XML element.
 */
export function fromObject(
  obj: Record<string, unknown>,
  rootTag: string,
): string {
  const builder = new XmlBuilder(rootTag);
  serializeObjectIntoBuilder(builder, obj);
  return builder.end();
}

function serializeObjectIntoBuilder(
  builder: XmlBuilder,
  obj: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      builder.ele(key).up();
    } else if (Array.isArray(value)) {
      for (const item of value) {
        builder.ele(key);
        if (typeof item === 'object' && item !== null) {
          serializeObjectIntoBuilder(builder, item as Record<string, unknown>);
        } else {
          builder.txt(String(item));
        }
        builder.up();
      }
    } else if (typeof value === 'object') {
      builder.ele(key);
      serializeObjectIntoBuilder(builder, value as Record<string, unknown>);
      builder.up();
    } else {
      builder.ele(key).txt(String(value)).up();
    }
  }
}

/**
 * Serialize an array of objects to XML.
 *
 * @param arr - Array of objects to serialize.
 * @param options - Root and item tag names.
 */
export function fromArray(
  arr: Record<string, unknown>[],
  options: FromArrayOptions = {},
): string {
  const rootTag = options.root ?? 'items';
  const itemTag = options.item ?? 'item';
  const builder = new XmlBuilder(rootTag);

  for (const item of arr) {
    builder.ele(itemTag);
    serializeObjectIntoBuilder(builder, item);
    builder.up();
  }

  return builder.end();
}

/**
 * Pretty-print an XML string with indentation.
 *
 * @param xml - Compact or already-formatted XML string.
 * @param options - Pretty-print options.
 */
export function prettyPrint(xml: string, options: PrettyPrintOptions = {}): string {
  const indent = options.indent ?? 2;
  const pad = ' '.repeat(indent);

  // Strip existing indentation/newlines around tags
  const compact = xml
    .replace(/>\s+</g, '><')
    .replace(/\s+$/, '')
    .trim();

  let result = '';
  let depth = 0;
  let i = 0;

  while (i < compact.length) {
    if (compact[i] === '<') {
      const end = compact.indexOf('>', i);
      if (end === -1) break;
      const tag = compact.slice(i, end + 1);

      const isClosing = tag.startsWith('</');
      const isSelfClosing = tag.endsWith('/>');
      const isDeclaration = tag.startsWith('<?');
      const isCdata = tag.startsWith('<![CDATA[');
      const isComment = tag.startsWith('<!--');

      if (isDeclaration) {
        result += tag + '\n';
      } else if (isCdata || isComment) {
        result += pad.repeat(depth) + tag + '\n';
      } else if (isClosing) {
        depth = Math.max(0, depth - 1);
        result += pad.repeat(depth) + tag + '\n';
      } else if (isSelfClosing) {
        result += pad.repeat(depth) + tag + '\n';
      } else {
        result += pad.repeat(depth) + tag + '\n';
        depth++;
      }

      i = end + 1;
    } else {
      // Text content between tags
      const nextTag = compact.indexOf('<', i);
      if (nextTag === -1) {
        result += pad.repeat(depth) + compact.slice(i);
        break;
      }
      const text = compact.slice(i, nextTag).trim();
      if (text) {
        // Attach inline text to last opened tag line
        const lines = result.trimEnd().split('\n');
        const lastLine = lines[lines.length - 1];
        lines[lines.length - 1] = lastLine + text;
        result = lines.join('\n') + '\n';
        depth--;
      }
      i = nextTag;
    }
  }

  return result.trimEnd();
}

/**
 * Compact an XML string by stripping indentation and extra whitespace.
 *
 * @param xml - XML string to compact.
 */
export function compact(xml: string): string {
  return xml
    .replace(/>\s+</g, '><')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .trim();
}

/**
 * Check whether an XML string is well-formed.
 *
 * @param xml - XML string to validate.
 */
export function validate(xml: string): ValidationResult {
  try {
    const parser = new XmlParser({ ignoreAttributes: false });
    parser.parse(xml);
    // Basic stack-based tag balance check
    const tags = [...xml.matchAll(/<\/?([a-zA-Z_][\w.-]*)(?:\s[^>]*)?\/?>/g)];
    const stack: string[] = [];
    for (const match of tags) {
      const fullTag = match[0];
      const tagName = match[1];
      if (fullTag.startsWith('</')) {
        if (stack[stack.length - 1] !== tagName) {
          return { valid: false, error: `Unexpected closing tag </${tagName}>` };
        }
        stack.pop();
      } else if (!fullTag.endsWith('/>') && !fullTag.startsWith('<?') && !fullTag.startsWith('<!')) {
        stack.push(tagName);
      }
    }
    if (stack.length > 0) {
      return { valid: false, error: `Unclosed tag: <${stack[stack.length - 1]}>` };
    }
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
