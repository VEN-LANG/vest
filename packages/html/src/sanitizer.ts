import type { SanitizeOptions } from './types.js';

const DEFAULT_BLOCKED = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'base'];
const DEFAULT_ALLOWED = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'col',
  'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em',
  'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 's',
  'samp', 'section', 'small', 'span', 'strong', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var',
];

function buildTagPattern(tags: string[]): RegExp {
  const joined = tags.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`<(${joined})[^>]*>[\\s\\S]*?<\\/\\1>`, 'gi');
}

/**
 * Sanitize an HTML string by removing dangerous tags and attributes.
 * This is a lightweight, regex-based sanitizer — sufficient for server-side
 * rendering where input is semi-trusted. For full untrusted user input,
 * prefer a DOM-based library.
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const blocked = options.blockedTags ?? DEFAULT_BLOCKED;
  const allowed = options.allowedTags ?? DEFAULT_ALLOWED;
  const stripAttrs = options.stripAttributes ?? [];

  let result = html;

  // Remove blocked tags including their content
  for (const tag of blocked) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    result = result.replace(re, '');
    // Also remove self-closing variants
    const reSelf = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    result = result.replace(reSelf, '');
  }

  // Strip tags not in allow-list (keep inner text)
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag: string) => {
    if (allowed.includes(tag.toLowerCase())) return match;
    return '';
  });

  // Strip dangerous attributes (on* event handlers, style)
  result = result.replace(/<([a-zA-Z][a-zA-Z0-9]*)\s([^>]+)>/g, (_match, tag: string, attrs: string) => {
    // Remove on* handlers always
    let cleaned = attrs.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    // Remove explicitly stripped attributes
    for (const attr of stripAttrs) {
      const safeAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\s*${safeAttr}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, 'gi');
      cleaned = cleaned.replace(re, '');
    }
    // Remove javascript: hrefs and srcs
    cleaned = cleaned.replace(/(href|src|action)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '');
    return `<${tag} ${cleaned.trim()}>`;
  });

  return result;
}
