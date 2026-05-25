# @lara-node/csv

Pure TypeScript CSV export/import for [Lara-Node](https://github.com/VEN-LANG/vest) — zero external runtime dependencies.

## Installation

```bash
npm install @lara-node/csv
# or
pnpm add @lara-node/csv
```

---

## Quick Start

```typescript
import { CSV } from '@lara-node/csv';

// Parse a CSV string
const rows = CSV.parse('name,age\nAlice,30\nBob,25');
// [{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }]

// Build a CSV string from an array
const csv = CSV.fromArray([{ name: 'Alice', age: 30 }]);
// "name,age\nAlice,30"
```

---

## Export — `CsvExportable`

Implement `CsvExportable` (plus optional concern interfaces) on any class to unlock CSV export.

```typescript
import {
  CSV,
  CsvExportable,
  WithCsvHeadings,
  WithCsvMapping,
  WithCsvEncoding,
  WithCsvTransform,
  WithCsvFilters,
  WithCsvSorting,
} from '@lara-node/csv';

class UsersExport
  implements CsvExportable, WithCsvHeadings, WithCsvMapping,
             WithCsvSorting, WithCsvFilters, WithCsvTransform
{
  async collection() {
    return db.users.findAll(); // any async data source
  }

  headings() {
    return ['ID', 'Name', 'Email', 'Joined'];
  }

  map(user: Record<string, unknown>) {
    return [user.id, user.name, user.email, user.createdAt];
  }

  // Sort by name before export
  sortBy() {
    return (a: Record<string, unknown>, b: Record<string, unknown>) =>
      String(a.name).localeCompare(String(b.name));
  }

  // Skip inactive users
  async filter(row: Record<string, unknown>) {
    return row.active === true;
  }

  // Transform a field on the fly
  async transform(row: Record<string, unknown>) {
    return { ...row, email: String(row.email).toLowerCase() };
  }
}

// Download via Express
app.get('/users.csv', async (req, res) => {
  await CSV.download(new UsersExport(), 'users.csv', res);
});

// Save to disk
await CSV.store(new UsersExport(), '/tmp/users.csv');

// Get the raw CSV string
const csvString = await CSV.raw(new UsersExport());

// Get as a Buffer
const buf = await CSV.toBuffer(new UsersExport());
```

### Optional Export Concerns

| Interface | Method | Description |
|-----------|--------|-------------|
| `WithCsvHeadings` | `headings(): string[]` | Explicit column headers |
| `WithCsvMapping` | `map(row): unknown[]` | Custom value extraction per row |
| `WithCsvEncoding` | `encoding(): string` | Output encoding (`utf-8` or `utf-8-bom`) |
| `WithCsvSorting` | `sortBy(): Comparator` | Sort collection before export |
| `WithCsvFilters` | `filter(row, index): boolean` | Skip rows during export |
| `WithCsvTransform` | `transform(row, index): Record` | Mutate rows before serialization |

---

## Import — `CsvImportable`

```typescript
import { CSV, CsvImportable, WithCsvStartRow, WithCsvValidation } from '@lara-node/csv';

class UsersImport implements CsvImportable, WithCsvStartRow, WithCsvValidation {
  startRow() {
    return 2; // Skip the header row (default)
  }

  // Validate each row — return false to skip, a string to throw an error
  validate(row: Record<string, string>, index: number) {
    if (!row.email?.includes('@')) {
      return false; // silently skip invalid rows
    }
    if (!row.name) {
      return 'Name is required'; // throws an Error
    }
    return true;
  }

  async model(row: Record<string, string>) {
    await db.users.create({ name: row.name, email: row.email });
  }
}

// Import from a file path
await CSV.import(new UsersImport(), '/uploads/users.csv');

// Import from a raw CSV string
await CSV.import(new UsersImport(), rawCsv, { type: 'string' });

// Custom delimiter (e.g. TSV)
await CSV.import(new UsersImport(), '/uploads/data.tsv', { delimiter: '\t' });
```

### Optional Import Concerns

| Interface | Method | Description |
|-----------|--------|-------------|
| `WithCsvStartRow` | `startRow(): number` | 1-based row to start reading data (default: 2) |
| `WithCsvChunkReading` | `chunkSize(): number` | Process in chunks for large files |
| `WithCsvValidation` | `validate(row, index)` | Per-row validation — `false` skips, `string` throws |

---

## Static Utilities

### `CSV.parse(csv, options?)`

Parse a CSV string into an array of keyed records.

```typescript
const rows = CSV.parse('a,b\n1,2\n3,4');
// [{ a: '1', b: '2' }, { a: '3', b: '4' }]

// Tab-separated
const tsv = CSV.parse('a\tb\n1\t2', { delimiter: '\t' });
```

### `CSV.parseBuffer(buf, options?)`

Parse a UTF-8 (or UTF-8 BOM) Buffer directly.

```typescript
const rows = CSV.parseBuffer(fs.readFileSync('data.csv'));
```

### `CSV.fromArray(data, options?)`

Build a CSV string from a plain array of objects — no export class required.

```typescript
const csv = CSV.fromArray(
  [{ name: 'Alice', score: 99 }, { name: 'Bob', score: 85 }],
  { headers: ['name', 'score'], encoding: 'utf-8-bom' }
);
```

### `CSV.count(csv)`

Count data rows (excludes the header row by default).

```typescript
const n = CSV.count('name,age\nAlice,30\nBob,25'); // 2
```

### `CSV.columns(csv)`

Extract column names from the header row.

```typescript
const cols = CSV.columns('id,name,email\n1,Alice,a@b.com');
// ['id', 'name', 'email']
```

### `CSV.filter(csv, predicate, options?)`

Filter rows in a CSV string using a predicate function.

```typescript
const adults = CSV.filter(csv, (row) => Number(row.age) >= 18);
```

### `CSV.transform(csv, fn, options?)`

Transform rows in a CSV string using a mapping function.

```typescript
const upper = CSV.transform(csv, (row) => ({
  ...row,
  name: row.name.toUpperCase(),
}));
```

### `CSV.sort(csv, columns, options?)`

Sort rows by one or more columns (numeric or lexicographic).

```typescript
const sorted = CSV.sort(csv, [
  { key: 'lastName', direction: 'asc' },
  { key: 'age', direction: 'desc' },
]);
```

### `CSV.select(csv, columns, options?)`

Project specific columns, dropping the rest.

```typescript
const slim = CSV.select(csv, ['id', 'email']);
```

### `CSV.deduplicate(csv, keys?, options?)`

Remove duplicate rows, optionally keyed on specific columns.

```typescript
const unique = CSV.deduplicate(csv, ['email']);
```

### `CSV.merge(csvStrings, options?)`

Merge multiple CSV strings into one. Only the header from the first string is kept.

```typescript
const combined = CSV.merge([januaryCsv, februaryCsv, marchCsv]);
```

### `CSV.columnStats(csv, column)`

Compute statistics for a numeric column.

```typescript
const stats = CSV.columnStats(csv, 'price');
// { min: 4.99, max: 99.99, sum: 1234.50, avg: 24.69, count: 50 }
```

### `CSV.stream(exportable, options?)` — async generator

Stream large exports in chunks without holding the entire dataset in memory.

```typescript
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Transfer-Encoding', 'chunked');
for await (const chunk of CSV.stream(new UsersExport(), { chunkSize: 500 })) {
  res.write(chunk);
}
res.end();
```

---

## Low-level API

### `CsvWriter`

```typescript
import { CsvWriter } from '@lara-node/csv';

const writer = new CsvWriter({ delimiter: ';', encoding: 'utf-8-bom' });

// Serialize a single row
const line = writer.serializeRow(['Alice', "O'Brien", 42]);

// Serialize a full dataset
const csv = writer.serialize(
  [['Alice', 30], ['Bob', 25]],
  ['Name', 'Age'],
);

// Stream chunks (async generator)
for await (const chunk of writer.stream(rows, headers, 1000)) {
  response.write(chunk);
}
```

### `CsvReader`

```typescript
import { CsvReader } from '@lara-node/csv';

const reader = new CsvReader({ delimiter: '\t', headers: true });
const rows = reader.parse(tsvString);
```

---

## Options Reference

### `CsvOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delimiter` | `string` | `','` | Column delimiter |
| `lineEnding` | `'\n' \| '\r\n'` | `'\n'` | Line-ending sequence |
| `encoding` | `'utf-8' \| 'utf-8-bom'` | `'utf-8'` | UTF-8 BOM for Excel compatibility |
| `quoteChar` | `string` | `'"'` | Quote character |
| `escapeChar` | `string` | `'"'` | Quote-escape character (doubled by default) |
| `includeHeaders` | `boolean` | `true` | Whether to write the header row |
| `nullValue` | `string` | `''` | Null/undefined representation |
| `booleanTrue` | `string` | `'1'` | Boolean `true` representation |
| `booleanFalse` | `string` | `'0'` | Boolean `false` representation |

### `ParseOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delimiter` | `string` | `','` | Column delimiter |
| `headers` | `boolean` | `true` | Whether the first row contains headers |
| `quoteChar` | `string` | `'"'` | Quote character |

### `StreamOptions` (extends `CsvOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chunkSize` | `number` | `1000` | Rows emitted per generator yield |

---

## License

MIT
