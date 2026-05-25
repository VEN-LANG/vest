/**
 * Options for Html.minify().
 */
export interface MinifyOptions {
  /** Remove HTML comments. Default: true */
  removeComments?: boolean;
  /** Collapse sequences of whitespace to a single space. Default: true */
  collapseWhitespace?: boolean;
  /** Remove attributes whose value is empty string. Default: false */
  removeEmptyAttributes?: boolean;
}

/**
 * A compiled template function returned by Html.compile().
 */
export type CompiledTemplate = (data: Record<string, unknown>) => string;

/**
 * Options for Html.table().
 */
export interface TableOptions {
  /** HTML attributes applied to the <table> element. */
  tableAttributes?: Record<string, string>;
  /** HTML attributes applied to the <thead> row. */
  theadAttributes?: Record<string, string>;
  /** HTML attributes applied to the <tbody> element. */
  tbodyAttributes?: Record<string, string>;
  /** Whether to include a <thead> row. Default: true */
  includeHeader?: boolean;
  /** Custom column labels. Falls back to object keys when omitted. */
  headers?: string[];
  /** Column keys to render. When omitted, all keys from the first row are used. */
  columns?: string[];
  /** CSS class applied to alternating (odd) rows. */
  stripedClass?: string;
  /** Caption text rendered as <caption>. */
  caption?: string;
}

/**
 * Options for Html.list().
 */
export interface ListOptions {
  /** 'ul' (default) or 'ol'. */
  type?: 'ul' | 'ol';
  /** CSS class applied to the list element. */
  listClass?: string;
  /** CSS class applied to each list item. */
  itemClass?: string;
  /** When provided, wraps each item in an <a href="..."> tag using this key from the item. */
  hrefKey?: string;
  /** Key used as the display label when items are objects. Default: first string-valued key. */
  labelKey?: string;
}

/**
 * Options for Html.pagination().
 */
export interface PaginationOptions {
  /** URL template where `{page}` is replaced with the page number. */
  urlTemplate: string;
  /** CSS class applied to the <nav> wrapper. */
  navClass?: string;
  /** CSS class applied to each page <a> element. */
  linkClass?: string;
  /** CSS class applied to the active page element. */
  activeClass?: string;
  /** CSS class applied to disabled (prev/next at boundary) elements. */
  disabledClass?: string;
  /** Number of pages to show around the current page. Default: 2 */
  window?: number;
  /** Label for the Previous button. Default: '&laquo;' */
  prevLabel?: string;
  /** Label for the Next button. Default: '&raquo;' */
  nextLabel?: string;
}

/**
 * A single breadcrumb item.
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Options for Html.breadcrumbs().
 */
export interface BreadcrumbOptions {
  /** Separator between items. Default: ' / ' */
  separator?: string;
  /** CSS class applied to the <nav> wrapper. */
  navClass?: string;
  /** aria-label for the nav element. Default: 'breadcrumb' */
  ariaLabel?: string;
}

/**
 * A single meta tag descriptor.
 */
export interface MetaTag {
  /** `name` attribute value (e.g. 'description', 'keywords'). */
  name?: string;
  /** `property` attribute value (e.g. 'og:title'). */
  property?: string;
  /** `http-equiv` attribute value. */
  httpEquiv?: string;
  /** `content` attribute value. */
  content: string;
  /** `charset` shorthand — produces <meta charset="...">. */
  charset?: string;
}

/**
 * Options for Html.sanitize().
 */
export interface SanitizeOptions {
  /** Tags whose content (including the tag itself) is completely removed. Default: ['script','style','iframe','object','embed','form'] */
  blockedTags?: string[];
  /** Allow only these tags and strip all others (keeping inner text). When omitted, a default allow-list is used. */
  allowedTags?: string[];
  /** Attributes to strip from every tag. Default: ['on*', 'style'] */
  stripAttributes?: string[];
}
