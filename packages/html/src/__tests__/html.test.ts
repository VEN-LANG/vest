import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockReadFile, mockWriteFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

import { Html } from '../Html.js';
import { minifyHtml } from '../minifier.js';
import { sanitizeHtml } from '../sanitizer.js';

// ---------------------------------------------------------------------------
// Html.render — inline templates & built-in helpers
// ---------------------------------------------------------------------------

describe('Html.render', () => {
  it('renders a simple template', () => {
    expect(Html.render('<h1>{{title}}</h1>', { title: 'Hello' })).toBe('<h1>Hello</h1>');
  });

  it('auto-escapes HTML in double-brace expressions', () => {
    const html = Html.render('{{value}}', { value: '<script>alert(1)</script>' });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('allows raw HTML with triple braces', () => {
    expect(Html.render('{{{value}}}', { value: '<b>bold</b>' })).toBe('<b>bold</b>');
  });

  it('renders without data argument', () => {
    expect(Html.render('<p>static</p>')).toBe('<p>static</p>');
  });

  it('leaves undefined variables as empty string', () => {
    expect(Html.render('{{missing}}')).toBe('');
  });

  it('renders {{#each}} blocks', () => {
    const html = Html.render(
      '{{#each items}}<li>{{this}}</li>{{/each}}',
      { items: ['A', 'B', 'C'] },
    );
    expect(html).toBe('<li>A</li><li>B</li><li>C</li>');
  });

  it('renders {{#if}} / {{else}}', () => {
    expect(Html.render('{{#if admin}}yes{{else}}no{{/if}}', { admin: true })).toBe('yes');
    expect(Html.render('{{#if admin}}yes{{else}}no{{/if}}', { admin: false })).toBe('no');
  });

  it('renders {{#unless}}', () => {
    expect(Html.render('{{#unless banned}}<button>Login</button>{{/unless}}', { banned: false }))
      .toBe('<button>Login</button>');
  });

  // ---
  // String helpers
  // ---

  it('uppercase', () => {
    expect(Html.render('{{uppercase v}}', { v: 'hello' })).toBe('HELLO');
  });

  it('lowercase', () => {
    expect(Html.render('{{lowercase v}}', { v: 'HELLO' })).toBe('hello');
  });

  it('capitalize', () => {
    expect(Html.render('{{capitalize v}}', { v: 'hello world' })).toBe('Hello world');
  });

  it('titleCase', () => {
    expect(Html.render('{{titleCase v}}', { v: 'hello world' })).toBe('Hello World');
  });

  it('truncate', () => {
    expect(Html.render('{{truncate v 5}}', { v: 'Hello World' })).toBe('Hello...');
  });

  it('truncate with custom suffix', () => {
    expect(Html.render('{{truncate v 5 "…"}}', { v: 'Hello World' })).toBe('Hello…');
  });

  it('slugify', () => {
    expect(Html.render('{{slugify v}}', { v: 'Hello World! 2024' })).toBe('hello-world-2024');
  });

  it('nl2br', () => {
    expect(Html.render('{{{nl2br v}}}', { v: 'line1\nline2' })).toBe('line1<br>line2');
  });

  it('repeat', () => {
    expect(Html.render('{{repeat v 3}}', { v: '*' })).toBe('***');
  });

  it('replace', () => {
    expect(Html.render('{{replace v "a" "b"}}', { v: 'banana' })).toBe('bbnbnb');
  });

  it('startsWith', () => {
    expect(Html.render('{{#if (startsWith v "He")}}yes{{/if}}', { v: 'Hello' })).toBe('yes');
  });

  it('endsWith', () => {
    expect(Html.render('{{#if (endsWith v "lo")}}yes{{/if}}', { v: 'Hello' })).toBe('yes');
  });

  it('padStart', () => {
    expect(Html.render('{{padStart v 5 "0"}}', { v: '42' })).toBe('00042');
  });

  it('padEnd', () => {
    expect(Html.render('{{padEnd v 5 "-"}}', { v: '42' })).toBe('42---');
  });

  it('join', () => {
    expect(Html.render('{{join arr ", "}}', { arr: ['a', 'b', 'c'] })).toBe('a, b, c');
  });

  it('includes — array', () => {
    expect(Html.render('{{#if (includes arr "b")}}yes{{/if}}', { arr: ['a', 'b'] })).toBe('yes');
  });

  it('includes — string', () => {
    expect(Html.render('{{#if (includes v "ell")}}yes{{/if}}', { v: 'Hello' })).toBe('yes');
  });

  // ---
  // Number helpers
  // ---

  it('currency — default $', () => {
    expect(Html.render('{{currency v}}', { v: 9.9 })).toBe('$9.90');
  });

  it('currency — custom symbol', () => {
    expect(Html.render('{{currency v symbol="€"}}', { v: 9.9 })).toBe('€9.90');
  });

  it('numberFormat', () => {
    expect(Html.render('{{numberFormat v decimals=2}}', { v: 1234.5 })).toBe('1,234.50');
  });

  it('percentage', () => {
    expect(Html.render('{{percentage v 200}}', { v: 50 })).toBe('25.0%');
  });

  it('round', () => {
    expect(Html.render('{{round v 2}}', { v: 3.14159 })).toBe('3.14');
  });

  it('abs', () => {
    expect(Html.render('{{abs v}}', { v: -42 })).toBe('42');
  });

  it('add / sub / mul / div', () => {
    expect(Html.render('{{add a b}}', { a: 3, b: 4 })).toBe('7');
    expect(Html.render('{{sub a b}}', { a: 10, b: 3 })).toBe('7');
    expect(Html.render('{{mul a b}}', { a: 3, b: 4 })).toBe('12');
    expect(Html.render('{{div a b}}', { a: 10, b: 2 })).toBe('5');
  });

  // ---
  // Date helpers
  // ---

  it('date', () => {
    const html = Html.render('{{date v}}', { v: '2024-01-15' });
    expect(html).toMatch(/1\/15\/2024|15\/01\/2024/); // locale may vary
  });

  it('dateTime', () => {
    const html = Html.render('{{dateTime v}}', { v: '2024-01-15T12:00:00Z' });
    expect(html).toBeTruthy();
  });

  // ---
  // Logic / comparison helpers
  // ---

  it('eq', () => {
    expect(Html.render('{{#if (eq status "active")}}yes{{/if}}', { status: 'active' })).toBe('yes');
  });

  it('neq', () => {
    expect(Html.render('{{#if (neq a b)}}yes{{/if}}', { a: 1, b: 2 })).toBe('yes');
  });

  it('gt', () => {
    expect(Html.render('{{#if (gt a b)}}big{{/if}}', { a: 10, b: 5 })).toBe('big');
  });

  it('gte', () => {
    expect(Html.render('{{#if (gte a b)}}yes{{/if}}', { a: 5, b: 5 })).toBe('yes');
  });

  it('lt', () => {
    expect(Html.render('{{#if (lt a b)}}yes{{/if}}', { a: 3, b: 10 })).toBe('yes');
  });

  it('lte', () => {
    expect(Html.render('{{#if (lte a b)}}yes{{/if}}', { a: 5, b: 5 })).toBe('yes');
  });

  it('and', () => {
    expect(Html.render('{{#if (and a b)}}yes{{/if}}', { a: true, b: true })).toBe('yes');
    expect(Html.render('{{#if (and a b)}}yes{{/if}}', { a: true, b: false })).toBe('');
  });

  it('or', () => {
    expect(Html.render('{{#if (or a b)}}yes{{/if}}', { a: false, b: true })).toBe('yes');
  });

  it('not', () => {
    expect(Html.render('{{#if (not v)}}yes{{/if}}', { v: false })).toBe('yes');
  });

  it('isEmpty — empty array', () => {
    expect(Html.render('{{#if (isEmpty v)}}yes{{/if}}', { v: [] })).toBe('yes');
  });

  it('isEmpty — non-empty string', () => {
    expect(Html.render('{{#if (isEmpty v)}}yes{{/if}}', { v: 'hi' })).toBe('');
  });

  // ---
  // Miscellaneous helpers
  // ---

  it('pluralize — singular', () => {
    expect(Html.render('{{pluralize n "item" "items"}}', { n: 1 })).toBe('item');
  });

  it('pluralize — plural', () => {
    expect(Html.render('{{pluralize n "item" "items"}}', { n: 5 })).toBe('items');
  });

  it('default — uses fallback when value is empty', () => {
    expect(Html.render('{{default v "N/A"}}', { v: '' })).toBe('N/A');
    expect(Html.render('{{default v "N/A"}}', { v: 'hello' })).toBe('hello');
  });

  it('json — pretty-prints an object', () => {
    const html = Html.render('{{{json data}}}', { data: { a: 1 } });
    expect(html).toContain('"a": 1');
  });

  // ---
  // Iteration helpers
  // ---

  it('times — renders n iterations', () => {
    const html = Html.render('{{#times 3}}.{{/times}}');
    expect(html).toBe('...');
  });

  it('times — exposes index, first, last', () => {
    const html = Html.render(
      '{{#times 2}}{{index}}-{{first}}-{{last}} {{/times}}',
    );
    expect(html).toContain('0-true-false');
    expect(html).toContain('1-false-true');
  });

  it('range — iterates from start to end inclusive', () => {
    const html = Html.render('{{#range 1 3}}{{this}}{{/range}}');
    expect(html).toBe('123');
  });
});

// ---------------------------------------------------------------------------
// Html.renderFile
// ---------------------------------------------------------------------------

describe('Html.renderFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads file and renders template', async () => {
    mockReadFile.mockResolvedValueOnce('<h1>{{title}}</h1>');
    const html = await Html.renderFile('/views/page.html', { title: 'Test' });
    expect(mockReadFile).toHaveBeenCalledWith('/views/page.html', 'utf-8');
    expect(html).toBe('<h1>Test</h1>');
  });

  it('renders without data', async () => {
    mockReadFile.mockResolvedValueOnce('<p>Static</p>');
    expect(await Html.renderFile('/views/static.html')).toBe('<p>Static</p>');
  });
});

// ---------------------------------------------------------------------------
// Html.compile + template cache
// ---------------------------------------------------------------------------

describe('Html.compile', () => {
  it('returns a reusable compiled template function', () => {
    const compiled = Html.compile('<h1>{{title}}</h1>');
    expect(compiled({ title: 'Page 1' })).toBe('<h1>Page 1</h1>');
    expect(compiled({ title: 'Page 2' })).toBe('<h1>Page 2</h1>');
  });
});

describe('Template cache', () => {
  afterEach(() => Html.clearCache());

  it('cacheSize increases after rendering', () => {
    const before = Html.cacheSize();
    Html.render(`unique-template-${Date.now()}`);
    expect(Html.cacheSize()).toBeGreaterThan(before);
  });

  it('clearCache resets to zero', () => {
    Html.render('{{x}}', { x: 1 });
    Html.clearCache();
    expect(Html.cacheSize()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Partials & Helpers
// ---------------------------------------------------------------------------

describe('Html.registerPartial', () => {
  it('registers and renders partials', () => {
    Html.registerPartial('greeting', '<span>Hello, {{name}}!</span>');
    const html = Html.render('{{> greeting}}', { name: 'Alice' });
    expect(html).toBe('<span>Hello, Alice!</span>');
  });
});

describe('Html.registerHelper', () => {
  it('registers a custom helper', () => {
    Html.registerHelper('shout', (value: unknown) => String(value).toUpperCase() + '!');
    expect(Html.render('{{shout msg}}', { msg: 'hello' })).toBe('HELLO!');
  });
});

// ---------------------------------------------------------------------------
// Html.minify
// ---------------------------------------------------------------------------

describe('Html.minify', () => {
  it('strips HTML comments', () => {
    const html = Html.minify('<!-- comment --><p>hello</p>');
    expect(html).not.toContain('<!-- comment -->');
    expect(html).toContain('<p>hello</p>');
  });

  it('collapses whitespace', () => {
    const html = Html.minify('  <p>  hello   world  </p>  ');
    expect(html).not.toMatch(/\s{2,}/);
  });

  it('removes empty attributes when option is set', () => {
    const html = Html.minify('<div id="" class="active"></div>', { removeEmptyAttributes: true });
    expect(html).not.toContain('id=""');
    expect(html).toContain('class="active"');
  });

  it('preserves content inside <pre> tags', () => {
    const html = Html.minify('<pre>  line1\n  line2  </pre>');
    expect(html).toContain('  line1\n  line2  ');
  });

  it('preserves IE conditional comments', () => {
    const html = Html.minify('<!--[if lt IE 9]><script></script><![endif]-->');
    expect(html).toContain('<!--[if lt IE 9]>');
  });
});

describe('minifyHtml direct', () => {
  it('returns unchanged html when all options disabled', () => {
    const input = '  <p>  hello  </p>  ';
    const out = minifyHtml(input, {
      removeComments: false,
      collapseWhitespace: false,
      removeEmptyAttributes: false,
    });
    expect(out).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// Html.sanitize (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.sanitize', () => {
  it('removes <script> tags including their content', () => {
    const html = Html.sanitize('<p>Hello</p><script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert');
    expect(html).toContain('Hello');
  });

  it('removes <iframe> tags', () => {
    const html = Html.sanitize('<p>text</p><iframe src="evil.com"></iframe>');
    expect(html).not.toContain('<iframe>');
  });

  it('strips onclick and other on* event handlers', () => {
    const html = Html.sanitize('<button onclick="evil()">Click</button>');
    expect(html).not.toContain('onclick');
    expect(html).toContain('Click');
  });

  it('strips javascript: hrefs', () => {
    const html = Html.sanitize('<a href="javascript:void(0)">link</a>');
    expect(html).not.toContain('javascript:');
  });

  it('allows tags in the allowedTags list through', () => {
    const html = Html.sanitize('<p><b>bold</b> <i>italic</i></p>', {
      allowedTags: ['p', 'b', 'i'],
    });
    expect(html).toContain('<b>bold</b>');
    expect(html).toContain('<i>italic</i>');
  });

  it('removes disallowed tags but keeps inner text', () => {
    const html = Html.sanitize('<div><span>text</span></div>', {
      allowedTags: ['div'],
    });
    expect(html).toContain('text');
    expect(html).not.toContain('<span>');
  });
});

describe('sanitizeHtml direct', () => {
  it('works standalone without Html class', () => {
    const result = sanitizeHtml('<p>safe</p><script>bad</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>safe</p>');
  });
});

// ---------------------------------------------------------------------------
// Html.strip (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.strip', () => {
  it('removes all HTML tags', () => {
    expect(Html.strip('<h1>Hello</h1><p>World</p>')).toBe('Hello\nWorld');
  });

  it('decodes common HTML entities', () => {
    expect(Html.strip('&amp;&lt;&gt;&quot;&#39;')).toBe('&<>"\'');
  });

  it('replaces &nbsp; with a space', () => {
    expect(Html.strip('Hello&nbsp;World')).toBe('Hello World');
  });

  it('returns empty string for empty input', () => {
    expect(Html.strip('')).toBe('');
  });

  it('trims the result', () => {
    expect(Html.strip('  <p>text</p>  ')).toBe('text');
  });
});

// ---------------------------------------------------------------------------
// Html.excerpt (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.excerpt', () => {
  it('strips HTML and truncates at the default length', () => {
    const html = '<p>' + 'a'.repeat(200) + '</p>';
    const result = Html.excerpt(html);
    expect(result.length).toBeLessThanOrEqual(163); // 160 chars + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('does not truncate when text is within limit', () => {
    const result = Html.excerpt('<p>Short</p>', 100);
    expect(result).toBe('Short');
    expect(result.endsWith('...')).toBe(false);
  });

  it('uses a custom suffix', () => {
    const html = '<p>' + 'x'.repeat(100) + '</p>';
    expect(Html.excerpt(html, 50, '…')).toMatch(/…$/);
  });
});

// ---------------------------------------------------------------------------
// Html.store (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.store', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes rendered template to the given file path', async () => {
    await Html.store('/public/report.html', '<h1>{{title}}</h1>', { title: 'Test' });
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/public/report.html',
      '<h1>Test</h1>',
      'utf-8',
    );
  });

  it('writes without data', async () => {
    await Html.store('/public/static.html', '<p>static</p>');
    expect(mockWriteFile).toHaveBeenCalledWith('/public/static.html', '<p>static</p>', 'utf-8');
  });
});

// ---------------------------------------------------------------------------
// Html.table (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.table', () => {
  const data = [
    { id: 1, name: 'Alice', score: 95 },
    { id: 2, name: 'Bob', score: 80 },
  ];

  it('generates a table with a header row', () => {
    const html = Html.table(data);
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<th>id</th>');
    expect(html).toContain('<td>Alice</td>');
    expect(html).toContain('<td>80</td>');
  });

  it('uses custom column headers', () => {
    const html = Html.table(data, {
      columns: ['id', 'name'],
      headers: ['#', 'Full Name'],
    });
    expect(html).toContain('<th>#</th>');
    expect(html).toContain('<th>Full Name</th>');
    expect(html).not.toContain('<th>score</th>');
  });

  it('includes table attributes', () => {
    const html = Html.table(data, {
      tableAttributes: { class: 'table', 'data-test': 'yes' },
    });
    expect(html).toContain('class="table"');
    expect(html).toContain('data-test="yes"');
  });

  it('applies striped class to alternating rows', () => {
    const html = Html.table(data, { stripedClass: 'odd' });
    expect(html).toContain('class="odd"');
  });

  it('includes a caption when specified', () => {
    const html = Html.table(data, { caption: 'User Scores' });
    expect(html).toContain('<caption>User Scores</caption>');
  });

  it('omits header when includeHeader is false', () => {
    const html = Html.table(data, { includeHeader: false });
    expect(html).not.toContain('<thead>');
  });

  it('renders null/undefined values as empty string', () => {
    const html = Html.table([{ name: null, val: undefined }] as unknown as Record<string, unknown>[]);
    expect(html).toContain('<td></td>');
  });

  it('returns minimal table for empty data', () => {
    const html = Html.table([]);
    expect(html).toContain('<table>');
    expect(html).toContain('<tbody>');
  });
});

// ---------------------------------------------------------------------------
// Html.list (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.list', () => {
  it('generates an unordered list by default', () => {
    const html = Html.list(['A', 'B', 'C']);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>A</li>');
    expect(html).toContain('<li>C</li>');
  });

  it('generates an ordered list when type is "ol"', () => {
    const html = Html.list(['First', 'Second'], { type: 'ol' });
    expect(html).toContain('<ol>');
    expect(html).toContain('</ol>');
  });

  it('applies CSS classes to list and items', () => {
    const html = Html.list(['A'], { listClass: 'nav', itemClass: 'nav-item' });
    expect(html).toContain('class="nav"');
    expect(html).toContain('class="nav-item"');
  });

  it('renders object items with a label key', () => {
    const html = Html.list([{ title: 'Home' }, { title: 'About' }], { labelKey: 'title' });
    expect(html).toContain('Home');
    expect(html).toContain('About');
  });

  it('wraps object items in <a> when hrefKey is set', () => {
    const html = Html.list(
      [{ title: 'Home', url: '/' }],
      { labelKey: 'title', hrefKey: 'url' },
    );
    expect(html).toContain('<a href="/">Home</a>');
  });
});

// ---------------------------------------------------------------------------
// Html.pagination (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.pagination', () => {
  it('generates a nav with page links', () => {
    const html = Html.pagination(3, 10, { urlTemplate: '/p/{page}' });
    expect(html).toContain('<nav>');
    // current page is rendered as <span>, adjacent pages as links
    expect(html).toContain('href="/p/4"');
  });

  it('marks the current page as active', () => {
    const html = Html.pagination(3, 10, {
      urlTemplate: '/p/{page}',
      activeClass: 'current',
    });
    expect(html).toContain('class="current"');
  });

  it('shows prev/next labels', () => {
    const html = Html.pagination(3, 10, {
      urlTemplate: '/p/{page}',
      prevLabel: '← Back',
      nextLabel: 'Forward →',
    });
    expect(html).toContain('← Back');
    expect(html).toContain('Forward →');
  });

  it('disables prev on first page', () => {
    const html = Html.pagination(1, 5, {
      urlTemplate: '/p/{page}',
      disabledClass: 'disabled',
    });
    // first page has no prev link
    const navContent = html.replace(/<nav[^>]*>/, '').replace(/<\/nav>/, '');
    expect(navContent.split('disabled')[0]).not.toContain('<a');
  });

  it('disables next on last page', () => {
    const html = Html.pagination(5, 5, {
      urlTemplate: '/p/{page}',
      disabledClass: 'off',
    });
    expect(html).toContain('class="off"');
  });

  it('applies navClass to the nav element', () => {
    const html = Html.pagination(2, 5, {
      urlTemplate: '/p/{page}',
      navClass: 'pagination',
    });
    expect(html).toContain('class="pagination"');
  });
});

// ---------------------------------------------------------------------------
// Html.breadcrumbs (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.breadcrumbs', () => {
  it('renders breadcrumb items separated by default separator', () => {
    const html = Html.breadcrumbs([
      { label: 'Home', href: '/' },
      { label: 'Users', href: '/users' },
      { label: 'Alice' },
    ]);
    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/users">Users</a>');
    expect(html).toContain('<span>Alice</span>');
    expect(html).toContain(' / ');
  });

  it('uses custom separator', () => {
    const html = Html.breadcrumbs(
      [{ label: 'A' }, { label: 'B' }],
      { separator: ' > ' },
    );
    expect(html).toContain(' > ');
  });

  it('applies navClass and ariaLabel', () => {
    const html = Html.breadcrumbs(
      [{ label: 'Home' }],
      { navClass: 'bc', ariaLabel: 'location' },
    );
    expect(html).toContain('class="bc"');
    expect(html).toContain('aria-label="location"');
  });

  it('does not wrap last item in an anchor', () => {
    const html = Html.breadcrumbs([
      { label: 'Home', href: '/' },
      { label: 'Current', href: '/current' },
    ]);
    // Last item with href should NOT have an anchor (it's the current page)
    const parts = html.split(' / ');
    expect(parts[parts.length - 1]).not.toContain('<a href="/current">');
  });
});

// ---------------------------------------------------------------------------
// Html.meta (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.meta', () => {
  it('generates a charset meta tag', () => {
    const html = Html.meta([{ charset: 'UTF-8' }]);
    expect(html).toBe('<meta charset="UTF-8">');
  });

  it('generates name/content meta tags', () => {
    const html = Html.meta([{ name: 'description', content: 'My app' }]);
    expect(html).toContain('name="description"');
    expect(html).toContain('content="My app"');
  });

  it('generates property meta tags (Open Graph)', () => {
    const html = Html.meta([{ property: 'og:title', content: 'Title' }]);
    expect(html).toContain('property="og:title"');
  });

  it('generates http-equiv meta tags', () => {
    const html = Html.meta([{ httpEquiv: 'X-UA-Compatible', content: 'IE=edge' }]);
    expect(html).toContain('http-equiv="X-UA-Compatible"');
  });

  it('generates multiple tags joined by newline', () => {
    const html = Html.meta([
      { charset: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width' },
    ]);
    const lines = html.split('\n');
    expect(lines).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Html.definitionList (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.definitionList', () => {
  it('generates a dl with dt/dd pairs', () => {
    const html = Html.definitionList({ Name: 'Alice', Role: 'Admin' });
    expect(html).toContain('<dl>');
    expect(html).toContain('<dt>Name</dt><dd>Alice</dd>');
    expect(html).toContain('<dt>Role</dt><dd>Admin</dd>');
  });

  it('applies a CSS class to the dl', () => {
    const html = Html.definitionList({ K: 'V' }, 'dl-horizontal');
    expect(html).toContain('class="dl-horizontal"');
  });

  it('renders null values as empty string', () => {
    const html = Html.definitionList({ key: null as unknown as string });
    expect(html).toContain('<dd></dd>');
  });
});

// ---------------------------------------------------------------------------
// Html.select (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html.select', () => {
  const options = [
    { value: 'ke', label: 'Kenya' },
    { value: 'ng', label: 'Nigeria' },
  ];

  it('generates a select element with options', () => {
    const html = Html.select('country', options);
    expect(html).toContain('<select name="country">');
    expect(html).toContain('<option value="ke">Kenya</option>');
    expect(html).toContain('<option value="ng">Nigeria</option>');
  });

  it('marks the selected option', () => {
    const html = Html.select('country', options, 'ke');
    expect(html).toContain('<option value="ke" selected>Kenya</option>');
    expect(html).not.toContain('<option value="ng" selected>');
  });

  it('applies extra attributes to the select element', () => {
    const html = Html.select('country', options, undefined, { class: 'form-select' });
    expect(html).toContain('class="form-select"');
  });
});

// ---------------------------------------------------------------------------
// Html.tag / Html.link / Html.image (new v0.2.0)
// ---------------------------------------------------------------------------

describe('Html element helpers', () => {
  it('Html.tag wraps content in a tag', () => {
    expect(Html.tag('span', 'Active', { class: 'badge' })).toBe('<span class="badge">Active</span>');
  });

  it('Html.link generates an anchor', () => {
    expect(Html.link('/profile', 'View Profile')).toBe('<a href="/profile">View Profile</a>');
  });

  it('Html.link supports extra attributes', () => {
    const html = Html.link('/x', 'X', { class: 'btn', target: '_blank' });
    expect(html).toContain('class="btn"');
    expect(html).toContain('target="_blank"');
  });

  it('Html.image generates an img tag', () => {
    const html = Html.image('/avatar.png', 'Avatar');
    expect(html).toContain('src="/avatar.png"');
    expect(html).toContain('alt="Avatar"');
  });

  it('Html.image supports extra attributes', () => {
    const html = Html.image('/img.png', 'Img', { width: '64', class: 'rounded' });
    expect(html).toContain('width="64"');
    expect(html).toContain('class="rounded"');
  });
});

// ---------------------------------------------------------------------------
// Express helpers
// ---------------------------------------------------------------------------

describe('Html.response', () => {
  it('sets Content-Type and ends with rendered HTML', () => {
    const res = { setHeader: vi.fn(), end: vi.fn() };
    Html.response(
      res as unknown as import('express').Response,
      '<h1>{{msg}}</h1>',
      { msg: 'Hi' },
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
    expect(res.end).toHaveBeenCalledWith('<h1>Hi</h1>');
  });
});

describe('Html.fileResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders file and sends HTML response', async () => {
    mockReadFile.mockResolvedValueOnce('<p>{{name}}</p>');
    const res = { setHeader: vi.fn(), end: vi.fn() };
    await Html.fileResponse(
      res as unknown as import('express').Response,
      '/views/page.html',
      { name: 'Bob' },
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
    expect(res.end).toHaveBeenCalledWith('<p>Bob</p>');
  });
});

describe('Html.download', () => {
  it('sets Content-Disposition: attachment and sends HTML', () => {
    const res = { setHeader: vi.fn(), end: vi.fn() };
    Html.download(
      res as unknown as import('express').Response,
      '<p>Export</p>',
      'export.html',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="export.html"',
    );
    expect(res.end).toHaveBeenCalledWith('<p>Export</p>');
  });
});

describe('Html.json (new v0.2.0)', () => {
  it('sends a JSON response with status 200 by default', () => {
    const res = { setHeader: vi.fn(), end: vi.fn(), statusCode: 0 };
    Html.json(res as unknown as import('express').Response, { ok: true });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
    expect(res.statusCode).toBe(200);
    expect(res.end).toHaveBeenCalledWith('{"ok":true}');
  });

  it('sets a custom status code', () => {
    const res = { setHeader: vi.fn(), end: vi.fn(), statusCode: 0 };
    Html.json(res as unknown as import('express').Response, { error: 'Not found' }, 404);
    expect(res.statusCode).toBe(404);
  });
});
