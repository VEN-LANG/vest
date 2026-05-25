import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReadFile, mockWriteFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

import { CSV } from '../CSV.js';
import { CsvWriter } from '../CsvWriter.js';
import { CsvReader } from '../CsvReader.js';
import type {
  CsvExportable,
  WithCsvHeadings,
  WithCsvMapping,
  WithCsvEncoding,
  CsvImportable,
  WithCsvStartRow,
  WithCsvValidation,
  WithCsvTransform,
  WithCsvFilters,
  WithCsvSorting,
} from '../concerns/index.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class UsersExport implements CsvExportable, WithCsvHeadings, WithCsvMapping {
  async collection() {
    return [
      { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
      { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
    ];
  }
  headings() { return ['ID', 'Name', 'Email', 'Active']; }
  map(row: Record<string, unknown>): unknown[] {
    return [row.id, row.name, row.email, row.active ? 'Yes' : 'No'];
  }
}

class NoHeadingsExport implements CsvExportable {
  async collection() {
    return [{ a: 1, b: 2 }];
  }
}

class BomExport implements CsvExportable, WithCsvEncoding {
  async collection() { return [{ id: 1, name: 'Alice' }]; }
  encoding(): 'utf-8-bom' { return 'utf-8-bom'; }
}

class EmptyExport implements CsvExportable {
  async collection() { return []; }
}

class BasicImport implements CsvImportable {
  readonly modelFn = vi.fn();
  async model(row: Record<string, string>): Promise<void> {
    this.modelFn(row);
  }
}

class StartRowImport implements CsvImportable, WithCsvStartRow {
  readonly modelFn = vi.fn();
  startRow() { return 3; }
  async model(row: Record<string, string>): Promise<void> { this.modelFn(row); }
}

class ValidationImport implements CsvImportable, WithCsvValidation {
  readonly modelFn = vi.fn();
  async validate(row: Record<string, string>) {
    if (!row.email) return false;
    if (row.email === 'bad@bad.com') return 'Email is blocked';
    return true;
  }
  async model(row: Record<string, string>): Promise<void> { this.modelFn(row); }
}

class SortedExport implements CsvExportable, WithCsvHeadings, WithCsvSorting {
  async collection() {
    return [
      { name: 'Charlie', score: 80 },
      { name: 'Alice', score: 95 },
      { name: 'Bob', score: 70 },
    ];
  }
  headings() { return ['name', 'score']; }
  sortBy() {
    return (a: Record<string, unknown>, b: Record<string, unknown>) =>
      String(a.name).localeCompare(String(b.name));
  }
}

class FilteredExport implements CsvExportable, WithCsvHeadings, WithCsvFilters {
  async collection() {
    return [
      { name: 'Alice', active: true },
      { name: 'Bob', active: false },
      { name: 'Carol', active: true },
    ];
  }
  headings() { return ['name', 'active']; }
  async filter(row: Record<string, unknown>) {
    return row.active === true;
  }
}

class TransformExport implements CsvExportable, WithCsvHeadings, WithCsvTransform {
  async collection() {
    return [{ name: 'alice', email: 'Alice@Example.Com' }];
  }
  headings() { return ['name', 'email']; }
  async transform(row: Record<string, unknown>) {
    return {
      name: String(row.name).toUpperCase(),
      email: String(row.email).toLowerCase(),
    };
  }
}

// ---------------------------------------------------------------------------
// CsvWriter unit tests
// ---------------------------------------------------------------------------

describe('CsvWriter', () => {
  describe('escapeField', () => {
    it('returns plain string unchanged', () => {
      const w = new CsvWriter();
      expect(w.escapeField('hello')).toBe('hello');
    });

    it('quotes strings containing the delimiter', () => {
      const w = new CsvWriter({ delimiter: ',' });
      expect(w.escapeField('hello,world')).toBe('"hello,world"');
    });

    it('escapes embedded quote chars by doubling', () => {
      const w = new CsvWriter();
      expect(w.escapeField('say "hi"')).toBe('"say ""hi"""');
    });

    it('quotes strings containing newlines', () => {
      const w = new CsvWriter();
      expect(w.escapeField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('quotes strings containing CR+LF', () => {
      const w = new CsvWriter();
      expect(w.escapeField('a\r\nb')).toBe('"a\r\nb"');
    });

    it('serializes null as empty string by default', () => {
      const w = new CsvWriter();
      expect(w.escapeField(null)).toBe('');
    });

    it('serializes undefined as empty string by default', () => {
      const w = new CsvWriter();
      expect(w.escapeField(undefined)).toBe('');
    });

    it('uses custom nullValue', () => {
      const w = new CsvWriter({ nullValue: 'N/A' });
      expect(w.escapeField(null)).toBe('N/A');
    });

    it('serializes boolean true as "1" by default', () => {
      const w = new CsvWriter();
      expect(w.escapeField(true)).toBe('1');
    });

    it('serializes boolean false as "0" by default', () => {
      const w = new CsvWriter();
      expect(w.escapeField(false)).toBe('0');
    });

    it('uses custom booleanTrue / booleanFalse', () => {
      const w = new CsvWriter({ booleanTrue: 'Yes', booleanFalse: 'No' });
      expect(w.escapeField(true)).toBe('Yes');
      expect(w.escapeField(false)).toBe('No');
    });

    it('converts numbers to strings', () => {
      const w = new CsvWriter();
      expect(w.escapeField(42)).toBe('42');
      expect(w.escapeField(0)).toBe('0');
      expect(w.escapeField(3.14)).toBe('3.14');
    });
  });

  describe('serializeRow', () => {
    it('joins fields with delimiter', () => {
      const w = new CsvWriter();
      expect(w.serializeRow([1, 'Alice', 'alice@example.com'])).toBe('1,Alice,alice@example.com');
    });

    it('uses custom delimiter', () => {
      const w = new CsvWriter({ delimiter: '\t' });
      expect(w.serializeRow(['a', 'b', 'c'])).toBe('a\tb\tc');
    });

    it('uses semicolon delimiter', () => {
      const w = new CsvWriter({ delimiter: ';' });
      expect(w.serializeRow(['a', 'b'])).toBe('a;b');
    });
  });

  describe('serialize', () => {
    it('includes headers when provided', () => {
      const w = new CsvWriter();
      const out = w.serialize([[1, 'Alice']], ['ID', 'Name']);
      expect(out).toBe('ID,Name\n1,Alice');
    });

    it('uses \\r\\n line ending when configured', () => {
      const w = new CsvWriter({ lineEnding: '\r\n' });
      const out = w.serialize([[1], [2]], ['ID']);
      expect(out).toBe('ID\r\n1\r\n2');
    });

    it('prepends BOM for utf-8-bom encoding', () => {
      const w = new CsvWriter({ encoding: 'utf-8-bom' });
      const out = w.serialize([[1]], ['ID']);
      expect(out.charCodeAt(0)).toBe(0xfeff);
    });

    it('handles empty rows array', () => {
      const w = new CsvWriter();
      const out = w.serialize([]);
      expect(out).toBe('');
    });

    it('includes only headers for empty rows when headers given', () => {
      const w = new CsvWriter();
      const out = w.serialize([], ['A', 'B']);
      expect(out).toBe('A,B');
    });
  });

  describe('stream', () => {
    it('yields chunks of rows', async () => {
      const w = new CsvWriter();
      const rows: unknown[][] = Array.from({ length: 25 }, (_, i) => [i]);
      const chunks: string[] = [];
      for await (const chunk of w.stream(rows, undefined, 10)) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBe(3);
    });

    it('includes headers in first chunk only', async () => {
      const w = new CsvWriter();
      const rows: unknown[][] = [[1], [2], [3]];
      const chunks: string[] = [];
      for await (const chunk of w.stream(rows, ['ID'], 2)) {
        chunks.push(chunk);
      }
      expect(chunks[0]).toContain('ID');
      expect(chunks[1]).not.toContain('ID');
    });

    it('handles empty collection with headers', async () => {
      const w = new CsvWriter();
      const chunks: string[] = [];
      for await (const chunk of w.stream([], ['ID'])) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe('ID');
    });
  });
});

// ---------------------------------------------------------------------------
// CsvReader unit tests
// ---------------------------------------------------------------------------

describe('CsvReader', () => {
  describe('parse', () => {
    it('parses basic CSV with headers', () => {
      const r = new CsvReader();
      const rows = r.parse('ID,Name\n1,Alice\n2,Bob');
      expect(rows).toEqual([
        { ID: '1', Name: 'Alice' },
        { ID: '2', Name: 'Bob' },
      ]);
    });

    it('strips UTF-8 BOM', () => {
      const r = new CsvReader();
      const rows = r.parse('﻿ID,Name\n1,Alice');
      expect(rows[0]).toHaveProperty('ID', '1');
    });

    it('handles quoted fields containing delimiter', () => {
      const r = new CsvReader();
      const rows = r.parse('Name,Address\nAlice,"123 Main St, Apt 4"');
      expect(rows[0]['Address']).toBe('123 Main St, Apt 4');
    });

    it('handles escaped quotes inside quoted fields', () => {
      const r = new CsvReader();
      const rows = r.parse('Name,Quote\nAlice,"She said ""hello"""');
      expect(rows[0]['Quote']).toBe('She said "hello"');
    });

    it('handles multiline quoted fields', () => {
      const r = new CsvReader();
      const rows = r.parse('Name,Bio\nAlice,"Line1\nLine2"');
      expect(rows[0]['Bio']).toBe('Line1\nLine2');
    });

    it('handles CRLF line endings', () => {
      const r = new CsvReader();
      const rows = r.parse('ID,Name\r\n1,Alice\r\n2,Bob');
      expect(rows).toHaveLength(2);
      expect(rows[0]['Name']).toBe('Alice');
    });

    it('parses without headers when headers=false', () => {
      const r = new CsvReader({ headers: false });
      const rows = r.parse('1,Alice\n2,Bob');
      expect(rows[0]).toEqual({ '0': '1', '1': 'Alice' });
    });

    it('uses custom delimiter', () => {
      const r = new CsvReader({ delimiter: '\t' });
      const rows = r.parse('ID\tName\n1\tAlice');
      expect(rows[0]['Name']).toBe('Alice');
    });

    it('returns empty array for empty input', () => {
      const r = new CsvReader();
      expect(r.parse('')).toEqual([]);
    });

    it('fills missing fields with empty string', () => {
      const r = new CsvReader();
      const rows = r.parse('A,B,C\n1,2');
      expect(rows[0]['C']).toBe('');
    });

    it('handles semicolon delimiter', () => {
      const r = new CsvReader({ delimiter: ';' });
      const rows = r.parse('A;B\n1;2');
      expect(rows[0]).toEqual({ A: '1', B: '2' });
    });
  });
});

// ---------------------------------------------------------------------------
// CSV facade — existing functionality
// ---------------------------------------------------------------------------

describe('CSV facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('raw', () => {
    it('returns CSV string with headers and mapped rows', async () => {
      const csv = await CSV.raw(new UsersExport());
      const lines = csv.split('\n');
      expect(lines[0]).toBe('ID,Name,Email,Active');
      expect(lines[1]).toBe('1,Alice,alice@example.com,Yes');
      expect(lines[2]).toBe('2,Bob,bob@example.com,No');
    });

    it('returns empty string for empty collection', async () => {
      expect(await CSV.raw(new EmptyExport())).toBe('');
    });

    it('uses object keys as headers when no WithCsvHeadings', async () => {
      expect(await CSV.raw(new NoHeadingsExport())).toBe('a,b\n1,2');
    });

    it('respects encoding option for BOM', async () => {
      const csv = await CSV.raw(new BomExport());
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('uses TSV delimiter when specified', async () => {
      const csv = await CSV.raw(new UsersExport(), { delimiter: '\t' });
      expect(csv.split('\n')[0]).toBe('ID\tName\tEmail\tActive');
    });
  });

  describe('download', () => {
    it('sets Content-Type and Content-Disposition headers', async () => {
      const res = { setHeader: vi.fn(), end: vi.fn() };
      await CSV.download(
        new UsersExport(),
        'users.csv',
        res as unknown as import('express').Response,
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="users.csv"',
      );
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('ID,Name'));
    });
  });

  describe('store', () => {
    it('writes CSV string to file', async () => {
      await CSV.store(new UsersExport(), '/tmp/users.csv');
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/tmp/users.csv',
        expect.stringContaining('Alice'),
        'utf-8',
      );
    });
  });

  describe('import — file', () => {
    it('calls readFile and passes rows to model', async () => {
      mockReadFile.mockResolvedValueOnce('Name,Email\nAlice,alice@example.com');
      const imp = new BasicImport();
      await CSV.import(imp, '/tmp/users.csv');
      expect(imp.modelFn).toHaveBeenCalledWith(
        expect.objectContaining({ Name: 'Alice', Email: 'alice@example.com' }),
      );
    });
  });

  describe('import — string', () => {
    it('parses CSV string directly', async () => {
      const imp = new BasicImport();
      await CSV.import(imp, 'Name,Email\nBob,bob@example.com', { type: 'string' });
      expect(imp.modelFn).toHaveBeenCalledWith(
        expect.objectContaining({ Name: 'Bob', Email: 'bob@example.com' }),
      );
      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });

  describe('fromArray', () => {
    it('builds CSV from array of objects', () => {
      const csv = CSV.fromArray([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]);
      expect(csv).toBe('name,age\nAlice,30\nBob,25');
    });

    it('uses explicit headers option', () => {
      const csv = CSV.fromArray([{ name: 'Alice', age: 30 }], { headers: ['Name', 'Age'] });
      expect(csv.split('\n')[0]).toBe('Name,Age');
    });

    it('returns empty string for empty array', () => {
      expect(CSV.fromArray([])).toBe('');
    });

    it('returns headers row for empty array when headers specified', () => {
      expect(CSV.fromArray([], { headers: ['ID', 'Name'] })).toBe('ID,Name');
    });
  });

  describe('parse', () => {
    it('parses a CSV string into records', () => {
      const rows = CSV.parse('ID,Name\n1,Alice\n2,Bob');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ ID: '1', Name: 'Alice' });
    });

    it('round-trips with fromArray', () => {
      const data = [{ ID: '1', Name: 'Alice' }, { ID: '2', Name: 'Bob' }];
      const csv = CSV.fromArray(data);
      const parsed = CSV.parse(csv);
      expect(parsed).toEqual(data);
    });
  });

  describe('stream', () => {
    it('yields all rows across chunks', async () => {
      const exp = new UsersExport();
      const chunks: string[] = [];
      for await (const chunk of CSV.stream(exp, { chunkSize: 1 })) {
        chunks.push(chunk);
      }
      const full = chunks.join('\n');
      expect(full).toContain('Alice');
      expect(full).toContain('Bob');
    });
  });
});

// ---------------------------------------------------------------------------
// CSV facade — NEW v0.2.0 functionality
// ---------------------------------------------------------------------------

describe('CSV — new concerns (v0.2.0)', () => {
  beforeEach(() => vi.clearAllMocks());

  // -------------------------------------------------------------------------
  // WithCsvSorting
  // -------------------------------------------------------------------------

  describe('WithCsvSorting', () => {
    it('sorts the collection alphabetically by name before export', async () => {
      const csv = await CSV.raw(new SortedExport());
      const lines = csv.split('\n').slice(1); // skip header
      expect(lines[0]).toContain('Alice');
      expect(lines[1]).toContain('Bob');
      expect(lines[2]).toContain('Charlie');
    });

    it('does not mutate the original collection', async () => {
      const exp = new SortedExport();
      const original = await exp.collection();
      await CSV.raw(exp);
      expect(original[0].name).toBe('Charlie'); // unchanged
    });
  });

  // -------------------------------------------------------------------------
  // WithCsvFilters
  // -------------------------------------------------------------------------

  describe('WithCsvFilters', () => {
    it('only includes rows where filter returns true', async () => {
      const csv = await CSV.raw(new FilteredExport());
      expect(csv).toContain('Alice');
      expect(csv).toContain('Carol');
      expect(csv).not.toContain('Bob');
    });

    it('returns header-only when all rows are filtered out', async () => {
      class AllFilteredExport implements CsvExportable, WithCsvHeadings, WithCsvFilters {
        async collection() { return [{ name: 'X' }, { name: 'Y' }]; }
        headings() { return ['name']; }
        async filter() { return false; }
      }
      const csv = await CSV.raw(new AllFilteredExport());
      const lines = csv.split('\n').filter(Boolean);
      expect(lines).toHaveLength(1); // headers only
      expect(lines[0]).toBe('name');
    });
  });

  // -------------------------------------------------------------------------
  // WithCsvTransform
  // -------------------------------------------------------------------------

  describe('WithCsvTransform', () => {
    it('applies transform to each row before serialization', async () => {
      const csv = await CSV.raw(new TransformExport());
      const lines = csv.split('\n');
      expect(lines[1]).toContain('ALICE');
      expect(lines[1]).toContain('alice@example.com');
    });
  });

  // -------------------------------------------------------------------------
  // WithCsvValidation
  // -------------------------------------------------------------------------

  describe('WithCsvValidation', () => {
    it('skips rows where validate returns false', async () => {
      const imp = new ValidationImport();
      const csv = 'email\nalice@example.com\n\nbob@example.com';
      await CSV.import(imp, csv, { type: 'string' });
      // Row with empty email is skipped
      expect(imp.modelFn).toHaveBeenCalledTimes(2);
    });

    it('throws an error when validate returns a string', async () => {
      const imp = new ValidationImport();
      const csv = 'email\nbad@bad.com';
      await expect(CSV.import(imp, csv, { type: 'string' })).rejects.toThrow('Email is blocked');
    });

    it('calls model when validate returns true', async () => {
      const imp = new ValidationImport();
      const csv = 'email\ngood@example.com';
      await CSV.import(imp, csv, { type: 'string' });
      expect(imp.modelFn).toHaveBeenCalledWith({ email: 'good@example.com' });
    });
  });
});

// ---------------------------------------------------------------------------
// CSV — new static utilities (v0.2.0)
// ---------------------------------------------------------------------------

describe('CSV static utilities (v0.2.0)', () => {
  const SAMPLE_CSV = 'name,age,city\nAlice,30,Nairobi\nBob,25,Lagos\nAlice,30,Nairobi\nCarol,35,Accra';

  // -------------------------------------------------------------------------
  // parseBuffer
  // -------------------------------------------------------------------------

  describe('parseBuffer', () => {
    it('parses a UTF-8 Buffer into records', () => {
      const buf = Buffer.from('name,age\nAlice,30\nBob,25', 'utf-8');
      const rows = CSV.parseBuffer(buf);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ name: 'Alice', age: '30' });
    });

    it('strips BOM from Buffer', () => {
      const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('id,name\n1,Alice')]);
      const rows = CSV.parseBuffer(buf);
      expect(rows[0]).toHaveProperty('id', '1');
    });
  });

  // -------------------------------------------------------------------------
  // toBuffer
  // -------------------------------------------------------------------------

  describe('toBuffer', () => {
    it('returns a Buffer containing the CSV bytes', async () => {
      const buf = await CSV.toBuffer(new UsersExport());
      expect(buf).toBeInstanceOf(Buffer);
      const str = buf.toString('utf-8');
      expect(str).toContain('Alice');
    });

    it('Buffer round-trips with parseBuffer', async () => {
      const exportable: CsvExportable = {
        async collection() { return [{ id: '1', name: 'Alice' }]; },
      };
      const buf = await CSV.toBuffer(exportable);
      const rows = CSV.parseBuffer(buf);
      expect(rows[0]).toEqual({ id: '1', name: 'Alice' });
    });
  });

  // -------------------------------------------------------------------------
  // count
  // -------------------------------------------------------------------------

  describe('count', () => {
    it('counts data rows (excluding header)', () => {
      expect(CSV.count('name,age\nAlice,30\nBob,25')).toBe(2);
    });

    it('returns 0 for header-only CSV', () => {
      expect(CSV.count('name,age')).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(CSV.count('')).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // columns
  // -------------------------------------------------------------------------

  describe('columns', () => {
    it('extracts column names from header row', () => {
      expect(CSV.columns('id,name,email\n1,Alice,a@b.com')).toEqual(['id', 'name', 'email']);
    });

    it('returns empty array for empty CSV', () => {
      expect(CSV.columns('')).toEqual([]);
    });

    it('works with custom delimiter', () => {
      expect(CSV.columns('a;b;c\n1;2;3', { delimiter: ';' })).toEqual(['a', 'b', 'c']);
    });
  });

  // -------------------------------------------------------------------------
  // filter
  // -------------------------------------------------------------------------

  describe('filter', () => {
    it('filters rows using a predicate', () => {
      const csv = 'name,age\nAlice,30\nBob,17\nCarol,22';
      const result = CSV.filter(csv, (row) => Number(row.age) >= 18);
      const rows = CSV.parse(result);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.name)).toEqual(['Alice', 'Carol']);
    });

    it('returns headers-only when no rows match', () => {
      const csv = 'name,age\nAlice,30';
      const result = CSV.filter(csv, () => false);
      const rows = CSV.parse(result);
      expect(rows).toHaveLength(0);
      // result still has the header line even with no data rows
      expect(result).toContain('name');
      expect(result).toContain('age');
    });

    it('passes row index to predicate', () => {
      const csv = 'name\nA\nB\nC\nD';
      const result = CSV.filter(csv, (_row, i) => i % 2 === 0);
      const rows = CSV.parse(result);
      expect(rows).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // transform
  // -------------------------------------------------------------------------

  describe('transform', () => {
    it('transforms each row using a mapping function', () => {
      const csv = 'name,email\nalice,Alice@Example.com';
      const result = CSV.transform(csv, (row) => ({
        name: row.name.toUpperCase(),
        email: row.email.toLowerCase(),
      }));
      const rows = CSV.parse(result);
      expect(rows[0]).toEqual({ name: 'ALICE', email: 'alice@example.com' });
    });

    it('can add new columns', () => {
      const csv = 'first,last\nJohn,Doe';
      const result = CSV.transform(csv, (row) => ({
        fullName: `${row.first} ${row.last}`,
      }));
      const rows = CSV.parse(result);
      expect(rows[0]['fullName']).toBe('John Doe');
    });
  });

  // -------------------------------------------------------------------------
  // sort
  // -------------------------------------------------------------------------

  describe('sort', () => {
    it('sorts rows alphabetically by a column', () => {
      const csv = 'name,age\nCharlie,30\nAlice,25\nBob,22';
      const result = CSV.sort(csv, [{ key: 'name', direction: 'asc' }]);
      const rows = CSV.parse(result);
      expect(rows.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts numerically in descending order', () => {
      const csv = 'name,score\nAlice,70\nBob,95\nCarol,85';
      const result = CSV.sort(csv, [{ key: 'score', direction: 'desc' }]);
      const rows = CSV.parse(result);
      expect(rows[0].score).toBe('95');
    });

    it('supports multi-column sort', () => {
      const csv = 'city,name\nLagos,Bob\nNairobi,Alice\nLagos,Alice';
      const result = CSV.sort(csv, [
        { key: 'city', direction: 'asc' },
        { key: 'name', direction: 'asc' },
      ]);
      const rows = CSV.parse(result);
      expect(rows[0]).toEqual({ city: 'Lagos', name: 'Alice' });
      expect(rows[1]).toEqual({ city: 'Lagos', name: 'Bob' });
    });
  });

  // -------------------------------------------------------------------------
  // select
  // -------------------------------------------------------------------------

  describe('select', () => {
    it('projects only the specified columns', () => {
      const csv = 'id,name,email\n1,Alice,alice@example.com';
      const result = CSV.select(csv, ['id', 'name']);
      const rows = CSV.parse(result);
      expect(rows[0]).toEqual({ id: '1', name: 'Alice' });
      expect(rows[0]).not.toHaveProperty('email');
    });

    it('preserves column order from the select list', () => {
      const csv = 'a,b,c\n1,2,3';
      const result = CSV.select(csv, ['c', 'a']);
      expect(CSV.columns(result)).toEqual(['c', 'a']);
    });

    it('fills missing columns with empty string', () => {
      const csv = 'name\nAlice';
      const result = CSV.select(csv, ['name', 'nonexistent']);
      const rows = CSV.parse(result);
      expect(rows[0]['nonexistent']).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // deduplicate
  // -------------------------------------------------------------------------

  describe('deduplicate', () => {
    it('removes fully duplicate rows', () => {
      const rows = CSV.parse(CSV.deduplicate(SAMPLE_CSV));
      expect(rows).toHaveLength(3);
    });

    it('deduplicates by specific key column', () => {
      const csv = 'name,score\nAlice,90\nAlice,80\nBob,70';
      const result = CSV.deduplicate(csv, ['name']);
      const rows = CSV.parse(result);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('Alice');
    });

    it('preserves first occurrence when deduplicating by key', () => {
      const csv = 'name,score\nAlice,90\nAlice,80';
      const result = CSV.deduplicate(csv, ['name']);
      const rows = CSV.parse(result);
      expect(rows[0].score).toBe('90');
    });
  });

  // -------------------------------------------------------------------------
  // merge
  // -------------------------------------------------------------------------

  describe('merge', () => {
    it('merges multiple CSV strings into one', () => {
      const a = 'name,age\nAlice,30';
      const b = 'name,age\nBob,25';
      const result = CSV.merge([a, b]);
      const rows = CSV.parse(result);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.name)).toEqual(['Alice', 'Bob']);
    });

    it('returns empty string for empty input', () => {
      expect(CSV.merge([])).toBe('');
    });

    it('returns header-only for single empty CSV', () => {
      const result = CSV.merge(['name,age']);
      const rows = CSV.parse(result);
      expect(rows).toHaveLength(0);
    });

    it('handles three or more CSVs', () => {
      const csvs = ['name\nAlice', 'name\nBob', 'name\nCarol'];
      const result = CSV.merge(csvs);
      const rows = CSV.parse(result);
      expect(rows).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // columnStats
  // -------------------------------------------------------------------------

  describe('columnStats', () => {
    it('computes min, max, sum, avg, count for a numeric column', () => {
      const csv = 'name,score\nAlice,80\nBob,60\nCarol,100';
      const stats = CSV.columnStats(csv, 'score');
      expect(stats.min).toBe(60);
      expect(stats.max).toBe(100);
      expect(stats.sum).toBe(240);
      expect(stats.avg).toBeCloseTo(80);
      expect(stats.count).toBe(3);
    });

    it('returns zeros for empty or non-numeric column', () => {
      const csv = 'name\nAlice\nBob';
      const stats = CSV.columnStats(csv, 'name');
      expect(stats).toEqual({ min: 0, max: 0, sum: 0, avg: 0, count: 0 });
    });

    it('ignores non-numeric values in mixed column', () => {
      const csv = 'val\n10\nN/A\n20';
      const stats = CSV.columnStats(csv, 'val');
      expect(stats.count).toBe(2);
      expect(stats.sum).toBe(30);
    });
  });
});
