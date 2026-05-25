import { describe, it, expect, vi } from 'vitest';
import { Xml } from '../Xml.js';
import { XmlBuilder } from '../XmlBuilder.js';
import { XmlParser } from '../XmlParser.js';
import { escape, unescape, fromObject, fromArray, validate, compact } from '../serializer.js';

// ---------------------------------------------------------------------------
// XmlBuilder — core
// ---------------------------------------------------------------------------

describe('XmlBuilder', () => {
  describe('basic element creation', () => {
    it('creates a single root element', () => {
      const xml = new XmlBuilder('root').end();
      expect(xml).toBe('<root/>');
    });

    it('creates nested elements via ele / up', () => {
      const xml = new XmlBuilder('root')
        .ele('child').txt('hello').up()
        .end();
      expect(xml).toBe('<root><child>hello</child></root>');
    });

    it('adds attributes with att()', () => {
      const xml = new XmlBuilder('user')
        .att('id', '1')
        .att('role', 'admin')
        .end();
      expect(xml).toContain('id="1"');
      expect(xml).toContain('role="admin"');
    });

    it('escapes attribute values', () => {
      const xml = new XmlBuilder('item').att('desc', 'a & b').end();
      expect(xml).toContain('desc="a &amp; b"');
    });

    it('escapes text content', () => {
      const xml = new XmlBuilder('root').ele('msg').txt('a < b & c > d').up().end();
      expect(xml).toContain('a &lt; b &amp; c &gt; d');
    });
  });

  describe('CDATA', () => {
    it('wraps content in CDATA section', () => {
      const xml = new XmlBuilder('root')
        .ele('script').cdata('function() { return 1 < 2; }').up()
        .end();
      expect(xml).toContain('<![CDATA[function() { return 1 < 2; }]]>');
    });
  });

  describe('comments', () => {
    it('inserts XML comments', () => {
      const xml = new XmlBuilder('root').comment('This is a comment').end();
      expect(xml).toContain('<!-- This is a comment -->');
    });
  });

  describe('XML declaration', () => {
    it('prepends XML declaration when specified', () => {
      const xml = new XmlBuilder('root', { version: '1.0', encoding: 'UTF-8' }).end();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('uses Xml.create factory with declaration', () => {
      const xml = Xml.create('root', { version: '1.0', encoding: 'UTF-8' })
        .ele('item').txt('value').up()
        .end();
      expect(xml).toMatch(/^<\?xml/);
      expect(xml).toContain('<item>value</item>');
    });
  });

  describe('prettyPrint via end()', () => {
    it('formats output with indentation', () => {
      const xml = new XmlBuilder('root')
        .ele('child').txt('hello').up()
        .end({ prettyPrint: true, indent: 2 });
      expect(xml).toContain('\n');
      expect(xml).toContain('  ');
    });
  });

  describe('self-closing elements', () => {
    it('renders empty elements as self-closing', () => {
      const xml = new XmlBuilder('root').ele('br').up().end();
      expect(xml).toContain('<br/>');
    });
  });

  describe('fluent chaining', () => {
    it('supports deep chaining with up()', () => {
      const xml = Xml.create('users')
        .ele('user').att('id', '1')
          .ele('name').txt('Alice').up()
          .ele('email').txt('alice@example.com').up()
        .up()
        .ele('user').att('id', '2')
          .ele('name').txt('Bob').up()
        .up()
        .end();
      expect(xml).toContain('<user id="1">');
      expect(xml).toContain('<name>Alice</name>');
      expect(xml).toContain('<name>Bob</name>');
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — ns(), pi(), raw()
  // -------------------------------------------------------------------------

  describe('ns()', () => {
    it('adds a namespace declaration attribute', () => {
      const xml = new XmlBuilder('root')
        .ns('xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        .end();
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    });

    it('adds a default namespace when prefix is empty string', () => {
      const xml = new XmlBuilder('feed')
        .ns('', 'http://www.w3.org/2005/Atom')
        .end();
      expect(xml).toContain('xmlns="http://www.w3.org/2005/Atom"');
    });

    it('returns the builder for chaining', () => {
      const builder = new XmlBuilder('root');
      expect(builder.ns('xsi', 'http://example.com')).toBe(builder);
    });
  });

  describe('pi()', () => {
    it('adds a processing instruction', () => {
      const xml = new XmlBuilder('root')
        .pi('xml-stylesheet', 'type="text/css" href="style.css"')
        .end();
      expect(xml).toContain('<?xml-stylesheet type="text/css" href="style.css"?>');
    });

    it('returns the builder for chaining', () => {
      const builder = new XmlBuilder('root');
      expect(builder.pi('target', 'content')).toBe(builder);
    });
  });

  describe('raw()', () => {
    it('injects raw XML without escaping', () => {
      const rawXml = '<custom:element xmlns:custom="http://example.com/ns"/>';
      const xml = new XmlBuilder('root').raw(rawXml).end();
      expect(xml).toContain(rawXml);
    });

    it('does not escape angle brackets in the raw string', () => {
      const xml = new XmlBuilder('root').raw('<br/>').end();
      expect(xml).toContain('<br/>');
      expect(xml).not.toContain('&lt;');
    });

    it('returns the builder for chaining', () => {
      const builder = new XmlBuilder('root');
      expect(builder.raw('<x/>')).toBe(builder);
    });
  });
});

// ---------------------------------------------------------------------------
// XmlParser — v0.2.0 additions
// ---------------------------------------------------------------------------

describe('XmlParser.find()', () => {
  it('finds the first matching tag at the top level', () => {
    const parser = new XmlParser();
    const obj = parser.parse('<user><name>Alice</name></user>');
    const user = parser.find(obj, 'user') as Record<string, unknown>;
    expect((user as Record<string, unknown>)['name']).toBe('Alice');
  });

  it('finds a deeply nested tag', () => {
    const parser = new XmlParser();
    const obj = parser.parse('<catalog><books><book><title>TypeScript</title></book></books></catalog>');
    const title = parser.find(obj, 'title');
    expect(title).toBe('TypeScript');
  });

  it('returns undefined when tag is not found', () => {
    const parser = new XmlParser();
    const obj = { root: { child: 'value' } };
    expect(parser.find(obj, 'missing')).toBeUndefined();
  });
});

describe('XmlParser.findAll()', () => {
  it('finds all matching tags across nested structure', () => {
    const parser = new XmlParser();
    const obj = parser.parse(
      '<catalog><book><author>Alice</author></book><book><author>Bob</author></book></catalog>',
    );
    const authors = parser.findAll(obj, 'author');
    expect(authors).toHaveLength(2);
    expect(authors).toContain('Alice');
    expect(authors).toContain('Bob');
  });

  it('returns empty array when tag is not found', () => {
    const parser = new XmlParser();
    const obj = { root: { child: 'value' } };
    expect(parser.findAll(obj, 'missing')).toEqual([]);
  });

  it('spreads arrays when the tag value is an array', () => {
    const parser = new XmlParser();
    // two sibling <item> elements become an array in the parsed object
    const obj = parser.parse('<list><item>A</item><item>B</item><item>C</item></list>');
    const items = parser.findAll(obj, 'item');
    expect(items).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Xml.fromObject
// ---------------------------------------------------------------------------

describe('Xml.fromObject', () => {
  it('serializes a flat object', () => {
    const xml = Xml.fromObject({ id: 1, name: 'Alice' }, 'user');
    expect(xml).toContain('<id>1</id>');
    expect(xml).toContain('<name>Alice</name>');
    expect(xml).toMatch(/^<user>/);
  });

  it('serializes nested objects', () => {
    const xml = Xml.fromObject({ address: { city: 'Nairobi', country: 'Kenya' } }, 'user');
    expect(xml).toContain('<address>');
    expect(xml).toContain('<city>Nairobi</city>');
    expect(xml).toContain('<country>Kenya</country>');
  });

  it('serializes array values as repeated elements', () => {
    const xml = Xml.fromObject({ tags: ['a', 'b', 'c'] }, 'item');
    expect(xml).toContain('<tags>a</tags>');
    expect(xml).toContain('<tags>b</tags>');
    expect(xml).toContain('<tags>c</tags>');
  });

  it('renders null values as empty elements', () => {
    const xml = Xml.fromObject({ notes: null }, 'item');
    expect(xml).toContain('<notes/>');
  });
});

// ---------------------------------------------------------------------------
// Xml.fromArray
// ---------------------------------------------------------------------------

describe('Xml.fromArray', () => {
  it('wraps items in root and item tags', () => {
    const xml = Xml.fromArray(
      [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
      { root: 'users', item: 'user' },
    );
    expect(xml).toMatch(/^<users>/);
    expect(xml).toContain('<user>');
    expect(xml).toContain('<id>1</id>');
    expect(xml).toContain('<name>Bob</name>');
  });

  it('uses default root/item names', () => {
    const xml = Xml.fromArray([{ x: 1 }]);
    expect(xml).toContain('<items>');
    expect(xml).toContain('<item>');
  });

  it('handles empty array', () => {
    const xml = Xml.fromArray([]);
    expect(xml).toBe('<items/>');
  });
});

// ---------------------------------------------------------------------------
// Xml.parse
// ---------------------------------------------------------------------------

describe('Xml.parse', () => {
  it('parses a simple XML string', () => {
    const data = Xml.parse('<user><name>Alice</name></user>');
    expect((data['user'] as Record<string, unknown>)['name']).toBe('Alice');
  });

  it('parses attributes when ignoreAttributes=false', () => {
    const data = Xml.parse('<user id="1"><name>Alice</name></user>', {
      ignoreAttributes: false,
      attributeNamePrefix: '@',
    });
    const user = data['user'] as Record<string, unknown>;
    expect(user['@id']).toBe('1');
  });

  it('round-trips from object through parse', () => {
    const original = { id: 1, name: 'Alice' };
    const xml = Xml.fromObject(original, 'user');
    const parsed = Xml.parse(xml);
    const user = parsed['user'] as Record<string, unknown>;
    expect(String(user['name'])).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// Xml.get
// ---------------------------------------------------------------------------

describe('Xml.get', () => {
  it('retrieves nested value by dot notation', () => {
    const data = Xml.parse('<root><a><b>hello</b></a></root>');
    expect(Xml.get(data, 'root.a.b')).toBe('hello');
  });

  it('returns undefined for missing path', () => {
    const data = { a: { b: 1 } };
    expect(Xml.get(data, 'a.c.d')).toBeUndefined();
  });

  it('accesses array elements by index', () => {
    const data = { users: { user: ['Alice', 'Bob'] } };
    expect(Xml.get(data as Record<string, unknown>, 'users.user.1')).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// v0.2.0 — Xml.find / Xml.findAll
// ---------------------------------------------------------------------------

describe('Xml.find', () => {
  it('finds the first matching tag in a parsed object', () => {
    const obj = Xml.parse('<catalog><book><title>TypeScript</title></book></catalog>');
    expect(Xml.find(obj, 'title')).toBe('TypeScript');
  });

  it('returns undefined when tag is absent', () => {
    expect(Xml.find({ root: {} }, 'missing')).toBeUndefined();
  });
});

describe('Xml.findAll', () => {
  it('finds all elements matching a tag name', () => {
    const obj = Xml.parse(
      '<catalog><book><author>Alice</author></book><book><author>Bob</author></book></catalog>',
    );
    const authors = Xml.findAll(obj, 'author');
    expect(authors).toHaveLength(2);
    expect(authors).toContain('Alice');
    expect(authors).toContain('Bob');
  });

  it('returns an empty array when nothing matches', () => {
    expect(Xml.findAll({ root: {} }, 'missing')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// v0.2.0 — Xml.fromJson
// ---------------------------------------------------------------------------

describe('Xml.fromJson', () => {
  it('converts a JSON string to XML with explicit root tag', () => {
    const xml = Xml.fromJson('{"name":"Alice","age":30}', 'user');
    expect(xml).toContain('<user>');
    expect(xml).toContain('<name>Alice</name>');
    expect(xml).toContain('<age>30</age>');
  });

  it('uses "root" as the default tag when none is provided', () => {
    const xml = Xml.fromJson('{"x":1}');
    expect(xml).toMatch(/^<root>/);
  });

  it('handles nested JSON objects', () => {
    const xml = Xml.fromJson('{"address":{"city":"Nairobi"}}', 'person');
    expect(xml).toContain('<city>Nairobi</city>');
  });
});

// ---------------------------------------------------------------------------
// v0.2.0 — Xml.transform
// ---------------------------------------------------------------------------

describe('Xml.transform', () => {
  it('parses, maps each item, and re-serializes', () => {
    const xml =
      '<users><user><id>1</id><name>alice</name></user><user><id>2</id><name>bob</name></user></users>';
    const result = Xml.transform(
      xml,
      'user',
      (u) => ({ id: u.id, name: String(u.name).toUpperCase() }),
      'users',
    );
    expect(result).toContain('ALICE');
    expect(result).toContain('BOB');
  });

  it('uses "items" as the default root tag', () => {
    const xml = '<list><item><v>1</v></item></list>';
    const result = Xml.transform(xml, 'item', (i) => i);
    expect(result).toMatch(/^<items>/);
  });
});

// ---------------------------------------------------------------------------
// v0.2.0 — Xml.merge
// ---------------------------------------------------------------------------

describe('Xml.merge', () => {
  it('combines children of two XML documents under a shared root', () => {
    const xmlA = '<data><name>Alice</name></data>';
    const xmlB = '<data><name>Bob</name></data>';
    const merged = Xml.merge(xmlA, xmlB, 'merged');
    expect(merged).toContain('Alice');
    expect(merged).toContain('Bob');
    expect(merged).toMatch(/^<merged>/);
  });

  it('uses "merged" as the default root tag', () => {
    const merged = Xml.merge('<a><x>1</x></a>', '<b><y>2</y></b>');
    expect(merged).toMatch(/^<merged>/);
  });
});

// ---------------------------------------------------------------------------
// v0.2.0 — Xml.strip
// ---------------------------------------------------------------------------

describe('Xml.strip', () => {
  it('removes all XML tags and returns plain text', () => {
    const text = Xml.strip('<root><item>Hello World</item></root>');
    expect(text).toBe('Hello World');
  });

  it('unwraps CDATA sections', () => {
    const text = Xml.strip('<root><![CDATA[Hello & World]]></root>');
    expect(text).toBe('Hello & World');
  });

  it('returns empty string for tag-only input', () => {
    expect(Xml.strip('<root/>')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// escape / unescape
// ---------------------------------------------------------------------------

describe('Xml.escape', () => {
  it('escapes all XML special characters', () => {
    const result = Xml.escape('Alice & Bob <you@example.com> "hello" \'world\'');
    expect(result).toBe('Alice &amp; Bob &lt;you@example.com&gt; &quot;hello&quot; &apos;world&apos;');
  });

  it('returns unchanged string with no special chars', () => {
    expect(Xml.escape('hello world')).toBe('hello world');
  });
});

describe('Xml.unescape', () => {
  it('unescapes all XML entities', () => {
    const result = Xml.unescape('&lt;b&gt;hello&amp;world&lt;/b&gt;');
    expect(result).toBe('<b>hello&world</b>');
  });

  it('leaves unknown entities unchanged', () => {
    expect(Xml.unescape('&nbsp;')).toBe('&nbsp;');
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

describe('Xml.validate', () => {
  it('returns valid=true for well-formed XML', () => {
    const result = Xml.validate('<root><item>value</item></root>');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('detects unclosed tags', () => {
    const result = Xml.validate('<root><item>value</item>');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('root');
  });

  it('detects mismatched closing tag', () => {
    const result = Xml.validate('<root><item></other></root>');
    expect(result.valid).toBe(false);
  });

  it('validates self-closing tags correctly', () => {
    const result = Xml.validate('<root><br/></root>');
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// prettyPrint / compact
// ---------------------------------------------------------------------------

describe('Xml.prettyPrint', () => {
  it('adds indentation to a compact XML string', () => {
    const xml = Xml.prettyPrint('<root><item>value</item></root>');
    expect(xml).toContain('\n');
    expect(xml).toContain('  ');
  });
});

describe('Xml.compact', () => {
  it('removes indentation and newlines', () => {
    const pretty = '<root>\n  <item>value</item>\n</root>';
    const result = Xml.compact(pretty);
    expect(result).toBe('<root><item>value</item></root>');
  });
});

// ---------------------------------------------------------------------------
// toJson
// ---------------------------------------------------------------------------

describe('Xml.toJson', () => {
  it('converts XML to a JSON string', () => {
    const json = Xml.toJson('<user><name>Alice</name></user>');
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const user = parsed['user'] as Record<string, unknown>;
    expect(user['name']).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// v0.2.0 — Feed generators
// ---------------------------------------------------------------------------

describe('Xml.toRss', () => {
  it('generates a valid RSS 2.0 feed', () => {
    const rss = Xml.toRss(
      {
        title: 'My Blog',
        link: 'https://myblog.com',
        description: 'Latest posts',
        language: 'en-us',
        generator: 'Lara-Node',
      },
      [
        {
          title: 'Hello World',
          link: 'https://myblog.com/hello',
          description: 'First post',
          pubDate: new Date('2024-01-15'),
          author: 'alice@myblog.com',
          category: ['Node.js', 'TypeScript'],
        },
      ],
    );
    expect(rss).toContain('<?xml version="1.0"');
    expect(rss).toContain('<rss version="2.0">');
    expect(rss).toContain('<title>My Blog</title>');
    expect(rss).toContain('<description>Latest posts</description>');
    expect(rss).toContain('<language>en-us</language>');
    expect(rss).toContain('<generator>Lara-Node</generator>');
    expect(rss).toContain('<item>');
    expect(rss).toContain('<title>Hello World</title>');
    expect(rss).toContain('<author>alice@myblog.com</author>');
    expect(rss).toContain('<category>Node.js</category>');
    expect(rss).toContain('<category>TypeScript</category>');
    expect(rss).toContain('<guid>https://myblog.com/hello</guid>');
  });

  it('uses item.link as guid when no explicit guid is set', () => {
    const rss = Xml.toRss(
      { title: 'T', link: 'https://t.com', description: 'D' },
      [{ title: 'Post', link: 'https://t.com/1' }],
    );
    expect(rss).toContain('<guid>https://t.com/1</guid>');
  });

  it('escapes special characters in title and description', () => {
    const rss = Xml.toRss(
      { title: 'A & B', link: 'https://t.com', description: '<desc>' },
      [],
    );
    expect(rss).toContain('&amp;');
    expect(rss).toContain('&lt;desc&gt;');
  });
});

describe('Xml.toAtom', () => {
  it('generates a valid Atom 1.0 feed', () => {
    const atom = Xml.toAtom(
      {
        id: 'https://myblog.com/',
        title: 'My Blog',
        updated: new Date('2024-01-01'),
        link: 'https://myblog.com',
        authorName: 'Alice',
      },
      [
        {
          id: 'https://myblog.com/1',
          title: 'Post 1',
          updated: new Date('2024-01-01'),
          link: 'https://myblog.com/1',
          summary: 'Summary text',
          content: '<p>Hello!</p>',
        },
      ],
    );
    expect(atom).toContain('<?xml version="1.0"');
    expect(atom).toContain('xmlns="http://www.w3.org/2005/Atom"');
    expect(atom).toContain('<title>My Blog</title>');
    expect(atom).toContain('<author><name>Alice</name></author>');
    expect(atom).toContain('<entry>');
    expect(atom).toContain('<title>Post 1</title>');
    expect(atom).toContain('<summary>Summary text</summary>');
    expect(atom).toContain('<content type="html">');
  });

  it('uses ISO 8601 date format for updated field', () => {
    const atom = Xml.toAtom(
      { id: 'https://t.com/', title: 'T', updated: new Date('2024-06-15') },
      [],
    );
    expect(atom).toContain('2024-06-15T');
  });
});

describe('Xml.toSitemap', () => {
  it('generates a valid sitemap.xml', () => {
    const sitemap = Xml.toSitemap(
      [
        {
          loc: 'https://example.com/',
          lastmod: new Date('2024-01-01'),
          changefreq: 'daily',
          priority: 1.0,
        },
        {
          loc: 'https://example.com/about',
          changefreq: 'monthly',
          priority: 0.7,
        },
      ],
      { prettyPrint: true },
    );
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(sitemap).toContain('<loc>https://example.com/</loc>');
    expect(sitemap).toContain('<changefreq>daily</changefreq>');
    expect(sitemap).toContain('<priority>1.0</priority>');
    expect(sitemap).toContain('<loc>https://example.com/about</loc>');
    expect(sitemap).toContain('<priority>0.7</priority>');
    expect(sitemap).toContain('<lastmod>2024-01-01</lastmod>');
  });

  it('outputs a compact sitemap by default (no prettyPrint)', () => {
    const sitemap = Xml.toSitemap([{ loc: 'https://example.com/' }]);
    expect(sitemap).not.toContain('\n  <url>');
  });

  it('escapes special characters in loc', () => {
    const sitemap = Xml.toSitemap([{ loc: 'https://example.com/?a=1&b=2' }]);
    expect(sitemap).toContain('&amp;');
  });
});

// ---------------------------------------------------------------------------
// Express response helpers
// ---------------------------------------------------------------------------

describe('Xml.response', () => {
  it('sets Content-Type: application/xml', () => {
    const res = { setHeader: vi.fn(), end: vi.fn() };
    Xml.response(res as unknown as import('express').Response, '<root/>');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/xml; charset=utf-8',
    );
    expect(res.end).toHaveBeenCalledWith('<root/>');
  });
});

describe('Xml.download', () => {
  it('sets Content-Disposition: attachment', () => {
    const res = { setHeader: vi.fn(), end: vi.fn() };
    Xml.download(res as unknown as import('express').Response, '<root/>', 'export.xml');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="export.xml"',
    );
    expect(res.end).toHaveBeenCalledWith('<root/>');
  });
});

describe('Xml.jsonResponse', () => {
  it('parses XML and sends JSON response', () => {
    const res = { setHeader: vi.fn(), end: vi.fn() };
    Xml.jsonResponse(
      res as unknown as import('express').Response,
      '<user><name>Alice</name></user>',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8',
    );
    const body = res.end.mock.calls[0][0] as string;
    const parsed = JSON.parse(body) as Record<string, unknown>;
    expect((parsed['user'] as Record<string, unknown>)['name']).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// Xml.create (factory)
// ---------------------------------------------------------------------------

describe('Xml.create', () => {
  it('returns an XmlBuilder instance', () => {
    expect(Xml.create('root')).toBeInstanceOf(XmlBuilder);
  });

  it('builds complex nested XML correctly', () => {
    const xml = Xml.create('users')
      .ele('user').att('id', '1').att('role', 'admin')
        .ele('name').txt('Alice').up()
        .ele('email').txt('alice@example.com').up()
        .ele('address')
          .ele('city').txt('Nairobi').up()
          .ele('country').txt('Kenya').up()
        .up()
      .up()
      .end();

    expect(xml).toContain('id="1"');
    expect(xml).toContain('<name>Alice</name>');
    expect(xml).toContain('<city>Nairobi</city>');
    expect(xml).toContain('<country>Kenya</country>');
  });

  it('produces well-formed output with ns, pi, and raw combined', () => {
    const xml = Xml.create('root', { version: '1.0', encoding: 'UTF-8' })
      .ns('xsi', 'http://www.w3.org/2001/XMLSchema-instance')
      .pi('xml-stylesheet', 'type="text/css" href="style.css"')
      .raw('<custom:x xmlns:custom="http://example.com"/>')
      .end({ prettyPrint: true });
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('xmlns:xsi=');
    expect(xml).toContain('<?xml-stylesheet');
    expect(xml).toContain('<custom:x');
  });
});
