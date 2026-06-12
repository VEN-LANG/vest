# CSV Export

Generate and parse CSV strings using `@lara-node/csv`.

```typescript
import {
  CSV,
  CsvExportable,
  CsvImportable,
  CsvWriter,
  CsvReader,
  WithCsvHeadings,
  WithCsvMapping,
  WithCsvEncoding,
  WithCsvSorting,
  WithCsvFilters,
  WithCsvTransform,
  WithCsvStartRow,
  WithCsvChunkReading,
  WithCsvValidation,
} from '@lara-node/csv';
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

Implement `CsvExportable` (plus optional concern interfaces) on any class.

```typescript
class UsersExport
  implements CsvExportable, WithCsvHeadings, WithCsvMapping,
             WithCsvSorting, WithCsvFilters, WithCsvTransform
{
  async collection() {
    return db.users.findAll();
  }

  headings() {
    return ['ID', 'Name', 'Email', 'Joined'];
  }

  map(user: Record<string, unknown>) {
    return [user.id, user.name, user.email, user.createdAt];
  }

  sortBy() {
    return (a, b) => String(a.name).localeCompare(String(b.name));
  }

  async filter(row: Record<string, unknown>) {
    return row.active === true;
  }

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

// Get raw string
const csvString = await CSV.raw(new UsersExport());

// Get as Buffer
const buf = await CSV.toBuffer(new UsersExport());
```

### Optional Export Concerns

| Interface | Method | Description |
|-----------|--------|-------------|
| `WithCsvHeadings` | `headings(): string[]` | Explicit column headers |
| `WithCsvMapping` | `map(row): unknown[]` | Custom value extraction per row |
| `WithCsvEncoding` | `encoding(): 'utf-8' \| 'utf-8-bom'` | Output encoding (BOM for Excel compat) |
| `WithCsvSorting` | `sortBy(): Comparator` | Sort collection before export |
| `WithCsvFilters` | `filter(row, index): boolean \| Promise<boolean>` | Skip rows during export |
| `WithCsvTransform` | `transform(row, index): Record \| Promise<Record>` | Mutate rows before serialization |

---

## Import — `CsvImportable`

```typescript
class UsersImport implements CsvImportable, WithCsvStartRow, WithCsvValidation {
  startRow() {
    return 2; // skip header row (default)
  }

  validate(row: Record<string, string>, index: number) {
    if (!row.email?.includes('@')) return false;  // silently skip
    if (!row.name) return 'Name is required';     // throws Error
    return true;
  }

  async model(row: Record<string, string>) {
    await db.users.create({ name: row.name, email: row.email });
  }
}

// Import from file
await CSV.import(new UsersImport(), '/uploads/users.csv');

// Import from string
await CSV.import(new UsersImport(), rawCsv, { type: 'string' });

// Tab-separated
await CSV.import(new UsersImport(), '/uploads/data.tsv', { delimiter: '\t' });
```

### Optional Import Concerns

| Interface | Method | Description |
|-----------|--------|-------------|
| `WithCsvStartRow` | `startRow(): number` | 1-based first data row (default: 2) |
| `WithCsvChunkReading` | `chunkSize(): number` | Process in chunks for large files |
| `WithCsvValidation` | `validate(row, index): boolean \| string \| Promise<...>` | `false` skips, `string` throws |

---

## Static Utilities (no class needed)

### `CSV.parse(csv, options?)`

Parse a CSV string into keyed records.

```typescript
const rows = CSV.parse('a,b\n1,2\n3,4');
// [{ a: '1', b: '2' }, { a: '3', b: '4' }]

const tsv = CSV.parse('a\tb\n1\t2', { delimiter: '\t' });
```

### `CSV.parseBuffer(buf, options?)`

Parse a UTF-8/UTF-8-BOM Buffer into records.

```typescript
const rows = CSV.parseBuffer(fs.readFileSync('data.csv'));
```

### `CSV.fromArray(data, options?)`

Build a CSV string from a plain array.

```typescript
const csv = CSV.fromArray(
  [{ name: 'Alice', score: 99 }],
  { headers: ['name', 'score'], encoding: 'utf-8-bom' },
);
```

### `CSV.count(csv)`

Count data rows (excludes header).

```typescript
CSV.count('name,age\nAlice,30\nBob,25'); // 2
```

### `CSV.columns(csv)`

Extract column names from the header row.

```typescript
CSV.columns('id,name,email\n1,Alice,a@b.com');
// ['id', 'name', 'email']
```

### `CSV.filter(csv, predicate, options?)`

Filter rows using a predicate.

```typescript
const adults = CSV.filter(csv, (row) => Number(row.age) >= 18);
```

### `CSV.transform(csv, fn, options?)`

Map over rows.

```typescript
const upper = CSV.transform(csv, (row) => ({
  ...row,
  name: row.name.toUpperCase(),
}));
```

### `CSV.sort(csv, columns, options?)`

Sort by one or more columns (numeric or lexicographic).

```typescript
const sorted = CSV.sort(csv, [
  { key: 'lastName', direction: 'asc' },
  { key: 'age', direction: 'desc' },
]);
```

### `CSV.select(csv, columns, options?)`

Project specific columns.

```typescript
const slim = CSV.select(csv, ['id', 'email']);
```

### `CSV.deduplicate(csv, keys?, options?)`

Remove duplicate rows, optionally keyed on specific columns.

```typescript
const unique = CSV.deduplicate(csv, ['email']);
```

### `CSV.merge(csvStrings, options?)`

Merge multiple CSV strings. Only the first header is kept by default.

```typescript
const combined = CSV.merge([januaryCsv, februaryCsv]);
```

### `CSV.columnStats(csv, column)`

Compute statistics for a numeric column.

```typescript
const stats = CSV.columnStats(csv, 'price');
// { min: 4.99, max: 99.99, sum: 1234.50, avg: 24.69, count: 50 }
```

### `CSV.stream(exportable, options?)`

Async generator for streaming large exports.

```typescript
res.setHeader('Content-Type', 'text/csv');
for await (const chunk of CSV.stream(new UsersExport(), { chunkSize: 500 })) {
  res.write(chunk);
}
res.end();
```

---

## Low-level API

### `CsvWriter`

```typescript
const writer = new CsvWriter({ delimiter: ';', encoding: 'utf-8-bom' });

const line = writer.serializeRow(['Alice', "O'Brien", 42]);

const csv = writer.serialize(
  [['Alice', 30], ['Bob', 25]],
  ['Name', 'Age'],
);

for await (const chunk of writer.stream(rows, headers, 1000)) {
  response.write(chunk);
}
```

### `CsvReader`

```typescript
const reader = new CsvReader({ delimiter: '\t', headers: true });
const rows = reader.parse(tsvString);
```

---

## Options

### `CsvOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delimiter` | `string` | `','` | Column delimiter |
| `lineEnding` | `'\n' \| '\r\n'` | `'\n'` | Line-ending sequence |
| `encoding` | `'utf-8' \| 'utf-8-bom'` | `'utf-8'` | BOM for Excel compatibility |
| `quoteChar` | `string` | `'"'` | Quote character |
| `escapeChar` | `string` | `'"'` | Quote-escape character (doubled) |
| `includeHeaders` | `boolean` | `true` | Write the header row |
| `nullValue` | `string` | `''` | Null/undefined representation |
| `booleanTrue` | `string` | `'1'` | Boolean `true` representation |
| `booleanFalse` | `string` | `'0'` | Boolean `false` representation |

### `ParseOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delimiter` | `string` | `','` | Column delimiter |
| `headers` | `boolean` | `true` | First row contains headers |
| `quoteChar` | `string` | `'"'` | Quote character |

### `StreamOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| *all CsvOptions* | | | Inherits all CSV options |
| `chunkSize` | `number` | `1000` | Rows per emitted chunk |
