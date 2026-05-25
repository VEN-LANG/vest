# @lara-node/excel

Laravel-inspired class-based Excel export/import for [Lara-Node](https://github.com/VEN-LANG/vest), powered by [ExcelJS](https://github.com/exceljs/exceljs).

Inspired by [Maatwebsite/Laravel-Excel](https://github.com/Maatwebsite/Laravel-Excel).

## Installation

```bash
npm install @lara-node/excel
# or
pnpm add @lara-node/excel
```

**Peer dependencies:** `express`

---

## Quick Start

```typescript
import { Excel } from '@lara-node/excel';

// No-class quick export from a plain array
const buf = await Excel.fromArray(
  [{ name: 'Alice', score: 99 }, { name: 'Bob', score: 85 }],
  { sheetName: 'Scores', headers: ['name', 'score'] }
);

// No-class quick import
const rows = await Excel.toArray('/uploads/data.xlsx');
```

---

## Export — `Exportable`

Implement `Exportable` on any class to unlock Excel export.

```typescript
import {
  Excel,
  Exportable,
  WithHeadings,
  WithMapping,
  WithStyles,
  WithColumnFormatting,
  WithTitle,
  WithAutoFilter,
  WithFrozenRows,
  WithColumnWidths,
  WithTabColor,
} from '@lara-node/excel';
import type ExcelJS from 'exceljs';

class UsersExport
  implements Exportable, WithHeadings, WithMapping, WithStyles,
             WithColumnFormatting, WithTitle, WithAutoFilter,
             WithFrozenRows, WithColumnWidths, WithTabColor
{
  async collection() {
    return db.users.findAll();
  }

  title() { return 'Users'; }

  headings() {
    return ['ID', 'Name', 'Email', 'Joined', 'Revenue'];
  }

  map(user: Record<string, unknown>) {
    return [user.id, user.name, user.email, user.createdAt, user.revenue];
  }

  columnFormats() {
    return { 5: '#,##0.00' }; // column E as currency
  }

  columnWidths() {
    return { 1: 8, 2: 25, 3: 35, 4: 18, 5: 14 };
  }

  autoFilter() { return true; } // apply to all heading columns

  frozenRows() { return 1; } // freeze header row

  tabColor() { return 'FF4472C4'; } // blue tab

  styles(worksheet: ExcelJS.Worksheet) {
    // Bold the header row
    worksheet.getRow(1).font = { bold: true };
    // Highlight header cells
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    return worksheet;
  }
}

// Download via Express
app.get('/users.xlsx', async (req, res) => {
  await Excel.download(new UsersExport(), 'users.xlsx', res);
});

// Save to disk
await Excel.store(new UsersExport(), '/tmp/users.xlsx');

// Get as Buffer
const buf = await Excel.raw(new UsersExport());

// Get as base64
const b64 = await Excel.base64(new UsersExport());

// Background job — write to a directory
await Excel.queue(new UsersExport(), 'users.xlsx', '/var/exports/');
```

### Export Concerns (full list)

| Interface | Method | Description |
|-----------|--------|-------------|
| `Exportable` | `collection()` | **Required.** Return the data rows |
| `WithHeadings` | `headings(): string[]` | Column headers |
| `WithMapping` | `map(row): unknown[]` | Custom column extraction per row |
| `WithStyles` | `styles(worksheet)` | Apply ExcelJS styles after rows are written |
| `WithColumnFormatting` | `columnFormats(): Record` | Number/date format strings per column |
| `WithColumnWidths` | `columnWidths(): Record` | Column widths in character units |
| `WithRowHeights` | `rowHeights(): Record` | Row heights in points |
| `WithTitle` | `title(): string` | Worksheet name |
| `WithProperties` | `properties(): object` | Workbook metadata (author, created, etc.) |
| `WithEvents` | `onRow(row, data)` | Hook into each row as it is written |
| `WithAutoFilter` | `autoFilter(): boolean \| string` | Enable auto-filter on headings |
| `WithFrozenRows` | `frozenRows(): number` | Number of rows to freeze (e.g. 1) |
| `WithFrozenColumns` | `frozenColumns(): number` | Number of columns to freeze |
| `WithTabColor` | `tabColor(): string` | ARGB hex for the sheet tab |
| `WithProtection` | `protection(): string \| options` | Password-protect the worksheet |
| `WithConditionalFormatting` | `conditionalFormats(): rule[]` | ExcelJS conditional formatting rules |

---

## Multiple Sheets — `WithMultipleSheets`

```typescript
import { Excel, WithMultipleSheets, Exportable, WithHeadings, WithTitle } from '@lara-node/excel';

class ActiveUsersSheet implements Exportable, WithHeadings, WithTitle {
  title() { return 'Active'; }
  headings() { return ['Name', 'Email']; }
  async collection() { return db.users.findAll({ where: { active: true } }); }
}

class InactiveUsersSheet implements Exportable, WithHeadings, WithTitle {
  title() { return 'Inactive'; }
  headings() { return ['Name', 'Email', 'LastLogin']; }
  async collection() { return db.users.findAll({ where: { active: false } }); }
}

class MultiSheetExport implements WithMultipleSheets {
  sheets() {
    return [new ActiveUsersSheet(), new InactiveUsersSheet()];
  }
}

await Excel.download(new MultiSheetExport(), 'users-report.xlsx', res);
```

---

## Import — `Importable`

```typescript
import {
  Excel,
  Importable,
  WithStartRow,
  WithBatchInserts,
  BeforeImport,
  AfterImport,
} from '@lara-node/excel';
import type ExcelJS from 'exceljs';

class UsersImport
  implements Importable, WithStartRow, WithBatchInserts, BeforeImport, AfterImport
{
  startRow() { return 2; } // skip header row

  batchSize() { return 100; } // insert in batches of 100

  beforeImport(workbook: ExcelJS.Workbook) {
    console.log(`Importing ${workbook.worksheets[0].rowCount - 1} rows`);
  }

  async batchInsert(rows: Record<string, unknown>[]) {
    await db.users.bulkCreate(rows);
  }

  async model(row: Record<string, unknown>) {
    // used when batchInsert is not implemented
    await db.users.create(row);
  }

  afterImport(workbook: ExcelJS.Workbook) {
    console.log('Import complete');
  }
}

// Import from a file
await Excel.import(new UsersImport(), '/uploads/users.xlsx');

// Import from a Buffer
await Excel.import(new UsersImport(), fileBuffer, { type: 'buffer' });
```

### Import Concerns

| Interface | Method | Description |
|-----------|--------|-------------|
| `Importable` | `model(row)` | **Required.** Process each row |
| `WithStartRow` | `startRow(): number` | 1-based first data row (default: 2) |
| `WithBatchInserts` | `batchSize() + batchInsert(rows)` | Batch processing for large files |
| `WithChunkReading` | `chunkSize(): number` | Read in chunks (streaming) |
| `BeforeImport` | `beforeImport(workbook)` | Called before any rows are processed |
| `AfterImport` | `afterImport(workbook)` | Called after all rows are processed |

---

## Static Helpers (no class required)

### `Excel.fromArray(data, options?)`

Create an Excel workbook from a plain array of objects.

```typescript
const buf = await Excel.fromArray(
  [{ product: 'Widget', qty: 100, price: 4.99 }],
  { sheetName: 'Inventory', headers: ['product', 'qty', 'price'] }
);
```

### `Excel.toArray(source, sheetIndex?, options?)`

Parse an Excel file or buffer into a plain array of objects (first row is used as headers).

```typescript
const rows = await Excel.toArray('/uploads/data.xlsx');
const rows = await Excel.toArray(buffer, 0, { type: 'buffer' });
```

### `Excel.sheets(source, options?)`

List the sheet names in a workbook.

```typescript
const names = await Excel.sheets('/uploads/report.xlsx');
// ['Summary', 'Details', 'Charts']
```

### `Excel.base64(exportable)`

Export a workbook as a base64-encoded string.

```typescript
const b64 = await Excel.base64(new UsersExport());
```

### `Excel.raw(exportable)`

Export a workbook as a raw `Buffer`.

### `Excel.store(exportable, filePath)`

Save the workbook to disk.

### `Excel.download(exportable, filename, res)`

Send the workbook as a file download via Express.

### `Excel.queue(exportable, filename, outputDir)`

Generate the file and write it to `outputDir` — useful for background jobs.

---

## Worksheet Protection

```typescript
class ProtectedExport implements Exportable, WithHeadings, WithProtection {
  // ...
  protection() {
    return {
      password: 's3cr3t',
      selectLockedCells: true,
      selectUnlockedCells: true,
      insertRows: false,
      deleteRows: false,
    };
  }
}
```

## Conditional Formatting

```typescript
class FormattedExport implements Exportable, WithHeadings, WithConditionalFormatting {
  // ...
  conditionalFormats() {
    return [
      {
        ref: 'E2:E1000',
        rules: [
          {
            type: 'cellIs',
            operator: 'lessThan',
            formulae: ['0'],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF0000' } },
            },
          },
        ],
      },
    ];
  }
}
```

---

## License

MIT
