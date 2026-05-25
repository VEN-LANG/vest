import Handlebars from 'handlebars';

// ---------------------------------------------------------------------------
// Template cache
// ---------------------------------------------------------------------------

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

// ---------------------------------------------------------------------------
// Built-in helpers
// ---------------------------------------------------------------------------

Handlebars.registerHelper('currency', (value: unknown, options: Handlebars.HelperOptions) => {
  const symbol = (options?.hash as Record<string, string>)?.symbol ?? '$';
  return `${symbol}${Number(value).toFixed(2)}`;
});

Handlebars.registerHelper('date', (value: unknown, options: Handlebars.HelperOptions) => {
  const locale = (options?.hash as Record<string, string>)?.locale ?? 'en-US';
  return new Date(String(value)).toLocaleDateString(locale);
});

Handlebars.registerHelper('dateTime', (value: unknown, options: Handlebars.HelperOptions) => {
  const locale = (options?.hash as Record<string, string>)?.locale ?? 'en-US';
  return new Date(String(value)).toLocaleString(locale);
});

Handlebars.registerHelper('json', (value: unknown) =>
  JSON.stringify(value, null, 2),
);

Handlebars.registerHelper('uppercase', (value: unknown) =>
  String(value).toUpperCase(),
);

Handlebars.registerHelper('lowercase', (value: unknown) =>
  String(value).toLowerCase(),
);

Handlebars.registerHelper('capitalize', (value: unknown) => {
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1);
});

Handlebars.registerHelper('titleCase', (value: unknown) =>
  String(value)
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' '),
);

Handlebars.registerHelper(
  'truncate',
  (value: unknown, length: unknown, suffix: unknown) => {
    const str = String(value);
    const len = typeof length === 'number' ? length : 50;
    const end = typeof suffix === 'string' ? suffix : '...';
    return str.length <= len ? str : str.slice(0, len) + end;
  },
);

Handlebars.registerHelper('pluralize', (count: unknown, singular: unknown, plural: unknown) => {
  const n = Number(count);
  return n === 1 ? String(singular) : String(plural ?? `${String(singular)}s`);
});

Handlebars.registerHelper('default', (value: unknown, fallback: unknown) =>
  value !== null && value !== undefined && value !== '' ? value : fallback,
);

Handlebars.registerHelper('nl2br', (value: unknown) =>
  new Handlebars.SafeString(String(value).replace(/\n/g, '<br>')),
);

Handlebars.registerHelper('slugify', (value: unknown) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, ''),
);

Handlebars.registerHelper(
  'numberFormat',
  (value: unknown, options: Handlebars.HelperOptions) => {
    const decimals = Number((options?.hash as Record<string, unknown>)?.decimals ?? 2);
    const locale = String((options?.hash as Record<string, unknown>)?.locale ?? 'en-US');
    return Number(value).toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },
);

Handlebars.registerHelper('percentage', (value: unknown, total: unknown, decimals: unknown) => {
  const pct = (Number(value) / Number(total)) * 100;
  const dp = typeof decimals === 'number' ? decimals : 1;
  return `${pct.toFixed(dp)}%`;
});

Handlebars.registerHelper('abs', (value: unknown) => Math.abs(Number(value)));
Handlebars.registerHelper('round', (value: unknown, dp: unknown) =>
  Number(Number(value).toFixed(typeof dp === 'number' ? dp : 0)),
);
Handlebars.registerHelper('add', (a: unknown, b: unknown) => Number(a) + Number(b));
Handlebars.registerHelper('sub', (a: unknown, b: unknown) => Number(a) - Number(b));
Handlebars.registerHelper('mul', (a: unknown, b: unknown) => Number(a) * Number(b));
Handlebars.registerHelper('div', (a: unknown, b: unknown) => Number(a) / Number(b));

Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper('neq', (a: unknown, b: unknown) => a !== b);
Handlebars.registerHelper('gt', (a: unknown, b: unknown) => (a as number) > (b as number));
Handlebars.registerHelper('gte', (a: unknown, b: unknown) => (a as number) >= (b as number));
Handlebars.registerHelper('lt', (a: unknown, b: unknown) => (a as number) < (b as number));
Handlebars.registerHelper('lte', (a: unknown, b: unknown) => (a as number) <= (b as number));
Handlebars.registerHelper('and', (a: unknown, b: unknown) => Boolean(a) && Boolean(b));
Handlebars.registerHelper('or', (a: unknown, b: unknown) => Boolean(a) || Boolean(b));
Handlebars.registerHelper('not', (a: unknown) => !a);
Handlebars.registerHelper('isEmpty', (value: unknown) => {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
});

Handlebars.registerHelper('join', (arr: unknown, sep: unknown) => {
  if (!Array.isArray(arr)) return String(arr);
  return arr.join(typeof sep === 'string' ? sep : ', ');
});

Handlebars.registerHelper('includes', (arr: unknown, item: unknown) => {
  if (Array.isArray(arr)) return arr.includes(item);
  if (typeof arr === 'string') return arr.includes(String(item));
  return false;
});

Handlebars.registerHelper('range', (start: unknown, end: unknown, options: Handlebars.HelperOptions) => {
  const s = Number(start);
  const e = Number(end);
  const items: number[] = [];
  for (let i = s; i <= e; i++) items.push(i);
  return items.map((i) => options.fn(i)).join('');
});

Handlebars.registerHelper('times', (n: unknown, options: Handlebars.HelperOptions) => {
  const count = Number(n);
  let result = '';
  for (let i = 0; i < count; i++) {
    result += options.fn({ index: i, first: i === 0, last: i === count - 1 });
  }
  return result;
});

Handlebars.registerHelper('repeat', (str: unknown, n: unknown) =>
  String(str).repeat(Number(n)),
);

Handlebars.registerHelper('replace', (str: unknown, search: unknown, replacement: unknown) =>
  String(str).split(String(search)).join(String(replacement)),
);

Handlebars.registerHelper('startsWith', (str: unknown, prefix: unknown) =>
  String(str).startsWith(String(prefix)),
);

Handlebars.registerHelper('endsWith', (str: unknown, suffix: unknown) =>
  String(str).endsWith(String(suffix)),
);

Handlebars.registerHelper('padStart', (str: unknown, length: unknown, char: unknown) =>
  String(str).padStart(Number(length), typeof char === 'string' ? char : ' '),
);

Handlebars.registerHelper('padEnd', (str: unknown, length: unknown, char: unknown) =>
  String(str).padEnd(Number(length), typeof char === 'string' ? char : ' '),
);

// ---------------------------------------------------------------------------
// Core render / compile
// ---------------------------------------------------------------------------

/**
 * Compile and render a Handlebars template string with the given data.
 * Uses a cache keyed by template content for repeated calls.
 */
export function renderTemplate(
  template: string,
  data: Record<string, unknown> = {},
): string {
  let compiled = templateCache.get(template);
  if (!compiled) {
    compiled = Handlebars.compile(template);
    templateCache.set(template, compiled);
  }
  return compiled(data);
}

/**
 * Compile a Handlebars template string and return a reusable function.
 */
export function compileTemplate(
  template: string,
): (data: Record<string, unknown>) => string {
  return Handlebars.compile(template);
}

/**
 * Register a Handlebars partial by name.
 */
export function registerPartial(name: string, template: string): void {
  Handlebars.registerPartial(name, template);
}

/**
 * Register a custom Handlebars helper.
 */
export function registerHelper(
  name: string,
  fn: (...args: unknown[]) => unknown,
): void {
  Handlebars.registerHelper(name, fn as Handlebars.HelperDelegate);
}

/**
 * Clear the compiled template cache.
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Return the number of cached compiled templates.
 */
export function templateCacheSize(): number {
  return templateCache.size;
}
