import { readFile, writeFile } from 'node:fs/promises';
import type { Response } from 'express';
import {
  renderTemplate,
  compileTemplate,
  registerPartial as regPartial,
  registerHelper as regHelper,
  clearTemplateCache,
  templateCacheSize,
} from './renderer.js';
import { minifyHtml } from './minifier.js';
import { sanitizeHtml } from './sanitizer.js';
import type {
  MinifyOptions,
  CompiledTemplate,
  TableOptions,
  ListOptions,
  PaginationOptions,
  BreadcrumbItem,
  BreadcrumbOptions,
  MetaTag,
  SanitizeOptions,
} from './types.js';

function attrs(record: Record<string, string> | undefined): string {
  if (!record) return '';
  return Object.entries(record)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');
}

/**
 * Facade for Handlebars-based HTML template rendering and Express response helpers.
 */
export class Html {
  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  /**
   * Render an inline Handlebars template string (synchronous).
   */
  static render(template: string, data?: Record<string, unknown>): string {
    return renderTemplate(template, data ?? {});
  }

  /**
   * Render a Handlebars template loaded from a file (asynchronous).
   */
  static async renderFile(
    filePath: string,
    data?: Record<string, unknown>,
  ): Promise<string> {
    const template = await readFile(filePath, 'utf-8');
    return renderTemplate(template, data ?? {});
  }

  /**
   * Compile a template string into a reusable function (better performance for repeated renders).
   */
  static compile(template: string): CompiledTemplate {
    return compileTemplate(template);
  }

  /**
   * Clear the compiled template cache.
   */
  static clearCache(): void {
    clearTemplateCache();
  }

  /**
   * Return the number of cached compiled templates.
   */
  static cacheSize(): number {
    return templateCacheSize();
  }

  // -------------------------------------------------------------------------
  // Partials & Helpers
  // -------------------------------------------------------------------------

  /**
   * Register a Handlebars partial template.
   */
  static registerPartial(name: string, template: string): void {
    regPartial(name, template);
  }

  /**
   * Register a custom Handlebars helper function.
   */
  static registerHelper(name: string, fn: (...args: unknown[]) => unknown): void {
    regHelper(name, fn);
  }

  // -------------------------------------------------------------------------
  // Minify / Sanitize / Text utilities
  // -------------------------------------------------------------------------

  /**
   * Minify an HTML string by stripping comments and collapsing whitespace.
   */
  static minify(html: string, options?: MinifyOptions): string {
    return minifyHtml(html, options);
  }

  /**
   * Sanitize an HTML string — removes dangerous tags, event handlers, and javascript: URIs.
   */
  static sanitize(html: string, options?: SanitizeOptions): string {
    return sanitizeHtml(html, options);
  }

  /**
   * Strip all HTML tags from a string, returning plain text.
   *
   * @param html - HTML string to strip.
   */
  static strip(html: string): string {
    return html
      .replace(/<\/(h[1-6]|p|div|section|article|li|blockquote|pre|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Extract a plain-text excerpt from an HTML string, truncated to `length` characters.
   *
   * @param html - HTML string.
   * @param length - Maximum number of characters. Default: 160.
   * @param suffix - Appended when truncated. Default: '...'.
   */
  static excerpt(html: string, length = 160, suffix = '...'): string {
    const text = Html.strip(html).replace(/\s+/g, ' ').trim();
    return text.length <= length ? text : text.slice(0, length).trimEnd() + suffix;
  }

  /**
   * Save rendered HTML to a file on disk.
   *
   * @param filePath - Absolute destination path.
   * @param template - Handlebars template string.
   * @param data - Template context data.
   */
  static async store(
    filePath: string,
    template: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const html = renderTemplate(template, data ?? {});
    await writeFile(filePath, html, 'utf-8');
  }

  // -------------------------------------------------------------------------
  // HTML generation helpers
  // -------------------------------------------------------------------------

  /**
   * Generate an HTML table from an array of objects.
   *
   * @param data - Array of row objects.
   * @param options - Table rendering options.
   */
  static table(data: Record<string, unknown>[], options: TableOptions = {}): string {
    const columns =
      options.columns ??
      (data.length > 0 ? Object.keys(data[0]) : []);

    const headers = options.headers ?? columns;
    const includeHeader = options.includeHeader !== false;
    const stripedClass = options.stripedClass ?? '';

    let html = `<table${attrs(options.tableAttributes)}>`;

    if (options.caption) {
      html += `<caption>${options.caption}</caption>`;
    }

    if (includeHeader && headers.length > 0) {
      html += `<thead${attrs(options.theadAttributes)}><tr>`;
      for (const h of headers) {
        html += `<th>${h}</th>`;
      }
      html += '</tr></thead>';
    }

    html += `<tbody${attrs(options.tbodyAttributes)}>`;
    for (let i = 0; i < data.length; i++) {
      const rowClass = stripedClass && i % 2 === 0 ? ` class="${stripedClass}"` : '';
      html += `<tr${rowClass}>`;
      for (const col of columns) {
        const val = data[i][col];
        html += `<td>${val !== null && val !== undefined ? String(val) : ''}</td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
  }

  /**
   * Generate an HTML unordered or ordered list from an array.
   *
   * @param items - Array of strings or objects.
   * @param options - List rendering options.
   */
  static list(items: (string | Record<string, unknown>)[], options: ListOptions = {}): string {
    const tag = options.type ?? 'ul';
    const listClass = options.listClass ? ` class="${options.listClass}"` : '';
    const itemClass = options.itemClass ? ` class="${options.itemClass}"` : '';

    let html = `<${tag}${listClass}>`;

    for (const item of items) {
      if (typeof item === 'string') {
        html += `<li${itemClass}>${item}</li>`;
      } else {
        const labelKey = options.labelKey ?? Object.keys(item).find((k) => typeof item[k] === 'string') ?? '';
        const label = String(item[labelKey] ?? '');
        if (options.hrefKey && item[options.hrefKey]) {
          html += `<li${itemClass}><a href="${String(item[options.hrefKey])}">${label}</a></li>`;
        } else {
          html += `<li${itemClass}>${label}</li>`;
        }
      }
    }

    html += `</${tag}>`;
    return html;
  }

  /**
   * Generate HTML pagination links.
   *
   * @param currentPage - The active page number (1-based).
   * @param totalPages - The total number of pages.
   * @param options - Pagination rendering options.
   */
  static pagination(
    currentPage: number,
    totalPages: number,
    options: PaginationOptions,
  ): string {
    const navClass = options.navClass ? ` class="${options.navClass}"` : '';
    const linkClass = options.linkClass ?? '';
    const activeClass = options.activeClass ?? 'active';
    const disabledClass = options.disabledClass ?? 'disabled';
    const windowSize = options.window ?? 2;
    const prevLabel = options.prevLabel ?? '&laquo;';
    const nextLabel = options.nextLabel ?? '&raquo;';

    const url = (page: number) =>
      options.urlTemplate.replace('{page}', String(page));

    const link = (page: number, label: string, extra = '') =>
      `<a href="${url(page)}" class="${[linkClass, extra].filter(Boolean).join(' ')}">${label}</a>`;

    let html = `<nav${navClass}>`;

    // Previous
    if (currentPage <= 1) {
      html += `<span class="${[linkClass, disabledClass].filter(Boolean).join(' ')}">${prevLabel}</span>`;
    } else {
      html += link(currentPage - 1, prevLabel);
    }

    // Pages
    const start = Math.max(1, currentPage - windowSize);
    const end = Math.min(totalPages, currentPage + windowSize);

    if (start > 1) {
      html += link(1, '1');
      if (start > 2) html += '<span>…</span>';
    }

    for (let p = start; p <= end; p++) {
      if (p === currentPage) {
        html += `<span class="${[linkClass, activeClass].filter(Boolean).join(' ')}">${p}</span>`;
      } else {
        html += link(p, String(p));
      }
    }

    if (end < totalPages) {
      if (end < totalPages - 1) html += '<span>…</span>';
      html += link(totalPages, String(totalPages));
    }

    // Next
    if (currentPage >= totalPages) {
      html += `<span class="${[linkClass, disabledClass].filter(Boolean).join(' ')}">${nextLabel}</span>`;
    } else {
      html += link(currentPage + 1, nextLabel);
    }

    html += '</nav>';
    return html;
  }

  /**
   * Generate an HTML breadcrumb trail.
   *
   * @param items - Array of breadcrumb items (label + optional href).
   * @param options - Breadcrumb rendering options.
   */
  static breadcrumbs(items: BreadcrumbItem[], options: BreadcrumbOptions = {}): string {
    const separator = options.separator ?? ' / ';
    const navClass = options.navClass ? ` class="${options.navClass}"` : '';
    const ariaLabel = options.ariaLabel ?? 'breadcrumb';

    const parts = items.map((item, i) => {
      if (item.href && i < items.length - 1) {
        return `<a href="${item.href}">${item.label}</a>`;
      }
      return `<span>${item.label}</span>`;
    });

    return `<nav${navClass} aria-label="${ariaLabel}">${parts.join(separator)}</nav>`;
  }

  /**
   * Generate HTML `<meta>` tags from a descriptor array.
   *
   * @param tags - Array of meta tag descriptors.
   */
  static meta(tags: MetaTag[]): string {
    return tags
      .map((tag) => {
        if (tag.charset) {
          return `<meta charset="${tag.charset}">`;
        }
        const parts: string[] = ['<meta'];
        if (tag.name) parts.push(`name="${tag.name}"`);
        if (tag.property) parts.push(`property="${tag.property}"`);
        if (tag.httpEquiv) parts.push(`http-equiv="${tag.httpEquiv}"`);
        parts.push(`content="${tag.content}"`);
        return parts.join(' ') + '>';
      })
      .join('\n');
  }

  /**
   * Generate an HTML definition list from a record.
   *
   * @param data - Record of term→description pairs.
   * @param dlClass - Optional CSS class for the `<dl>` element.
   */
  static definitionList(data: Record<string, unknown>, dlClass?: string): string {
    const classAttr = dlClass ? ` class="${dlClass}"` : '';
    let html = `<dl${classAttr}>`;
    for (const [key, val] of Object.entries(data)) {
      html += `<dt>${key}</dt><dd>${val !== null && val !== undefined ? String(val) : ''}</dd>`;
    }
    html += '</dl>';
    return html;
  }

  /**
   * Generate a `<select>` dropdown from an array of options.
   *
   * @param name - The `name` attribute of the select element.
   * @param options - Array of `{value, label}` objects.
   * @param selected - Currently selected value.
   * @param selectAttributes - Extra attributes on the `<select>` element.
   */
  static select(
    name: string,
    options: Array<{ value: string; label: string }>,
    selected?: string,
    selectAttributes?: Record<string, string>,
  ): string {
    const extraAttrs = attrs(selectAttributes);
    let html = `<select name="${name}"${extraAttrs}>`;
    for (const opt of options) {
      const sel = opt.value === selected ? ' selected' : '';
      html += `<option value="${opt.value}"${sel}>${opt.label}</option>`;
    }
    html += '</select>';
    return html;
  }

  /**
   * Wrap content in an HTML tag.
   *
   * @param tag - HTML tag name.
   * @param content - Inner content.
   * @param attributes - Optional HTML attributes.
   */
  static tag(tag: string, content: string, attributes?: Record<string, string>): string {
    return `<${tag}${attrs(attributes)}>${content}</${tag}>`;
  }

  /**
   * Generate an anchor `<a>` tag.
   */
  static link(href: string, label: string, attributes?: Record<string, string>): string {
    return Html.tag('a', label, { href, ...attributes });
  }

  /**
   * Generate an `<img>` tag.
   */
  static image(src: string, alt: string, attributes?: Record<string, string>): string {
    const attrStr = attrs({ src, alt, ...attributes });
    return `<img${attrStr}>`;
  }

  // -------------------------------------------------------------------------
  // Express helpers
  // -------------------------------------------------------------------------

  /**
   * Render an inline template and send the result as an HTML response.
   */
  static response(
    res: Response,
    template: string,
    data?: Record<string, unknown>,
  ): void {
    const html = renderTemplate(template, data ?? {});
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  }

  /**
   * Render a template file and send the result as an HTML response.
   */
  static async fileResponse(
    res: Response,
    filePath: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const html = await Html.renderFile(filePath, data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  }

  /**
   * Send an HTML string as a file download.
   */
  static download(res: Response, html: string, filename: string): void {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(html, 'utf-8').toString());
    res.end(html);
  }

  /**
   * Send a JSON-serialized value as an application/json response.
   */
  static json(res: Response, data: unknown, status = 200): void {
    const body = JSON.stringify(data);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = status;
    res.end(body);
  }
}
