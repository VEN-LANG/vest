# Excel Export

Generate Excel (`.xlsx`) files using `@lara-node/excel`, powered by [ExcelJS](https://github.com/exceljs/exceljs).

```typescript
import {
  Excel,
  Exportable,
  Importable,
  WithHeadings,
  WithMapping,
  WithStyles,
  WithColumnFormatting,
  WithColumnWidths,
  WithRowHeights,
  WithTitle,
  WithProperties,
  WithEvents,
  WithAutoFilter,
  WithFrozenRows,
  WithFrozenColumns,
  WithTabColor,
  WithProtection,
  WithConditionalFormatting,
  WithMultipleSheets,
  WithBatchInserts,
  WithChunkReading,
  WithStartRow,
  BeforeImport,
  AfterImport,
} from '@lara-node/excel';
```

**Peer dependency:** `express`

---

## Quick Start

```typescript
import { Excel } from '@lara-node/excel';

// No-class export from a plain array
const buf = await Excel.fromArray(
  [{ name: 'Alice', score: 99 }, { name: 'Bob', score: 85 }],
  { sheetName: 'Scores', headers: ['name', 'score'] },
);

// No-class import
const rows = await Excel.toArray('/uploads/data.xlsx');
```

---

## Export — `Exportable`

Implement `Exportable` on any class to unlock Excel export.

```typescript
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

  autoFilter() { return true; }

  frozenRows() { return 1; }

  tabColor() { return 'FF4472C4'; }

  styles(worksheet: ExcelJS.Worksheet) {
    worksheet.getRow(1).font = { bold: true };
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

// Background job
await Excel.queue(new UsersExport(), 'users.xlsx', '/var/exports/');
```

### Export Concerns

| Interface | Method | Description |
|-----------|--------|-------------|
| `Exportable` | `collection()` | **Required.** Return the data rows |
| `WithHeadings` | `headings(): string[]` | Column headers |
| `WithMapping` | `map(row): unknown[]` | Custom column extraction |
| `WithStyles` | `styles(worksheet)` | Apply ExcelJS styles after rows |
| `WithColumnFormatting` | `columnFormats(): Record<string, string>` | Number/date format per column |
| `WithColumnWidths` | `columnWidths(): Record<string, number>` | Column widths in characters |
| `WithRowHeights` | `rowHeights(): Record<number, number>` | Row heights in points |
| `WithTitle` | `title(): string` | Worksheet name |
| `WithProperties` | `properties(): Partial<WorkbookProperties>` | Workbook metadata |
| `WithEvents` | `onRow(row, data)` | Hook into each row write |
| `WithAutoFilter` | `autoFilter(): boolean \| string` | Enable auto-filter on headings |
| `WithFrozenRows` | `frozenRows(): number` | Freeze top N rows |
| `WithFrozenColumns` | `frozenColumns(): number` | Freeze left N columns |
| `WithTabColor` | `tabColor(): string` | ARGB hex for sheet tab |
| `WithProtection` | `protection(): string \| WorksheetProtectionOptions` | Protect the worksheet |
| `WithConditionalFormatting` | `conditionalFormats(): ConditionalFormattingRule[]` | Conditional formatting rules |

---

## Multiple Sheets — `WithMultipleSheets`

```typescript
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
class UsersImport
  implements Importable, WithStartRow, WithBatchInserts, BeforeImport, AfterImport
{
  startRow() { return 2; }

  batchSize() { return 100; }

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

// Import from file
await Excel.import(new UsersImport(), '/uploads/users.xlsx');

// Import from Buffer
await Excel.import(new UsersImport(), fileBuffer, { type: 'buffer' });
```

### Import Concerns

| Interface | Method | Description |
|-----------|--------|-------------|
| `Importable` | `model(row)` | **Required.** Process each row |
| `WithStartRow` | `startRow(): number` | 1-based first data row (default: 2) |
| `WithBatchInserts` | `batchSize() + batchInsert(rows)` | Batch processing |
| `WithChunkReading` | `chunkSize(): number` | Read in chunks (streaming) |
| `BeforeImport` | `beforeImport(workbook)` | Called before row processing |
| `AfterImport` | `afterImport(workbook)` | Called after all rows processed |

---

## Static Helpers

### `Excel.fromArray(data, options?)`

Create a workbook from a plain array.

```typescript
const buf = await Excel.fromArray(
  [{ product: 'Widget', qty: 100, price: 4.99 }],
  { sheetName: 'Inventory', headers: ['product', 'qty', 'price'] },
);
```

### `Excel.toArray(source, sheetIndex?, options?)`

Parse into an array of objects (first row = headers).

```typescript
const rows = await Excel.toArray('/uploads/data.xlsx');
const rows = await Excel.toArray(buffer, 0, { type: 'buffer' });
```

### `Excel.sheets(source, options?)`

List sheet names.

```typescript
const names = await Excel.sheets('/uploads/report.xlsx');
// ['Summary', 'Details', 'Charts']
```

---

## Worksheet Protection

```typescript
class ProtectedExport implements Exportable, WithHeadings, WithProtection {
  protection() {
    return {
      password: 's3cr3t',
      selectLockedCells: true,
      insertRows: false,
      deleteRows: false,
    };
  }
}
```

## Conditional Formatting

```typescript
class FormattedExport implements Exportable, WithHeadings, WithConditionalFormatting {
  conditionalFormats() {
    return [
      {
        ref: 'E2:E1000',
        rules: [{
          type: 'cellIs',
          operator: 'lessThan',
          formulae: ['0'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF0000' } } },
        }],
      },
    ];
  }
}
```
