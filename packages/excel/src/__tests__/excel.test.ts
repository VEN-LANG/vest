import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock primitives so vi.mock factories can reference them
// ---------------------------------------------------------------------------

const {
  mockCommit,
  mockAddRow,
  mockGetColumn,
  mockGetRow,
  mockProtect,
  mockAddConditionalFormatting,
  mockWorksheet,
  mockWriteBuffer,
  mockReadFile,
  mockLoad,
  mockWorkbook,
  mockWriteFile,
} = vi.hoisted(() => {
  const mockCommit = vi.fn();
  const mockAddRow = vi.fn().mockReturnValue({ commit: vi.fn(), eachCell: vi.fn() });
  const mockGetColumn = vi.fn().mockReturnValue({ numFmt: '', alignment: {}, width: 0 });
  const mockGetRow = vi.fn().mockReturnValue({ eachCell: vi.fn(), commit: vi.fn(), height: 0 });
  const mockProtect = vi.fn().mockResolvedValue(undefined);
  const mockAddConditionalFormatting = vi.fn();

  const mockWorksheet = {
    addRow: mockAddRow,
    getRow: mockGetRow,
    getColumn: mockGetColumn,
    protect: mockProtect,
    addConditionalFormatting: mockAddConditionalFormatting,
    rowCount: 0,
    name: 'Sheet1',
    properties: {} as Record<string, unknown>,
    views: [] as unknown[],
    autoFilter: '' as string | boolean,
  };

  const mockWriteBuffer = vi.fn().mockResolvedValue(Buffer.from('XLSX-mock'));
  const mockReadFile = vi.fn().mockResolvedValue(undefined);
  const mockLoad = vi.fn().mockResolvedValue(undefined);

  const mockWorkbook = {
    addWorksheet: vi.fn().mockReturnValue(mockWorksheet),
    properties: {},
    xlsx: {
      writeBuffer: mockWriteBuffer,
      readFile: mockReadFile,
      load: mockLoad,
    },
    worksheets: [mockWorksheet],
  };

  const mockWriteFile = vi.fn().mockResolvedValue(undefined);

  return {
    mockCommit,
    mockAddRow,
    mockGetColumn,
    mockGetRow,
    mockProtect,
    mockAddConditionalFormatting,
    mockWorksheet,
    mockWriteBuffer,
    mockReadFile,
    mockLoad,
    mockWorkbook,
    mockWriteFile,
  };
});

// ---------------------------------------------------------------------------
// Module mocks (factories run after vi.hoisted so all vars are live)
// ---------------------------------------------------------------------------

vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn().mockImplementation(() => mockWorkbook),
  },
}));

vi.mock('node:fs/promises', () => ({
  writeFile: mockWriteFile,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { Excel } from '../Excel.js';
import type {
  Exportable,
  WithHeadings,
  WithMapping,
  WithStyles,
  WithColumnFormatting,
  WithMultipleSheets,
  WithTitle,
  WithProperties,
  WithEvents,
  Importable,
  WithBatchInserts,
  BeforeImport,
  AfterImport,
  WithStartRow,
  WithAutoFilter,
  WithFrozenRows,
  WithFrozenColumns,
  WithTabColor,
  WithColumnWidths,
  WithRowHeights,
  WithProtection,
  WithConditionalFormatting,
  ConditionalFormattingRule,
} from '../concerns/index.js';
import type ExcelJS from 'exceljs';

// ---------------------------------------------------------------------------
// Test helpers — export classes
// ---------------------------------------------------------------------------

class BasicExport implements Exportable {
  async collection() {
    return [
      { id: 1, name: 'Alice', amount: 100 },
      { id: 2, name: 'Bob', amount: 200 },
    ];
  }
}

class HeadedExport implements Exportable, WithHeadings {
  async collection() {
    return [{ id: 1, name: 'Alice' }];
  }
  headings() {
    return ['ID', 'Name'];
  }
}

class MappedExport implements Exportable, WithHeadings, WithMapping {
  async collection() {
    return [{ id: 1, name: 'Alice', amount: 199.99 }];
  }
  headings() {
    return ['#', 'Customer', 'Amount'];
  }
  map(row: Record<string, unknown>): unknown[] {
    return [row.id, row.name, `$${Number(row.amount).toFixed(2)}`];
  }
}

class StyledExport implements Exportable, WithStyles {
  async collection() {
    return [{ id: 1 }];
  }
  styles(ws: ExcelJS.Worksheet): ExcelJS.Worksheet {
    ws.getRow(1).commit();
    return ws;
  }
}

class FormattedExport implements Exportable, WithColumnFormatting {
  async collection() {
    return [{ amount: 1000 }];
  }
  columnFormats(): Record<string, string> {
    return { '1': '#,##0.00' };
  }
}

class TitledExport implements Exportable, WithTitle {
  async collection() {
    return [{ x: 1 }];
  }
  title() {
    return 'Custom Sheet';
  }
}

class Sheet1 implements Exportable, WithTitle {
  async collection() {
    return [{ a: 1 }];
  }
  title() {
    return 'Invoices';
  }
}

class Sheet2 implements Exportable, WithTitle {
  async collection() {
    return [{ b: 2 }];
  }
  title() {
    return 'Summary';
  }
}

class MultiSheet implements WithMultipleSheets {
  sheets(): Exportable[] {
    return [new Sheet1(), new Sheet2()];
  }
}

class EventExport implements Exportable, WithEvents {
  readonly rowCallback = vi.fn();
  async collection() {
    return [{ id: 1 }];
  }
  onRow(row: ExcelJS.Row, data: Record<string, unknown>): void {
    this.rowCallback(row, data);
  }
}

// ---------------------------------------------------------------------------
// Test helpers — v0.2.0 export concern classes
// ---------------------------------------------------------------------------

class AutoFilterBoolExport implements Exportable, WithHeadings, WithAutoFilter {
  async collection() { return [{ id: 1, name: 'Alice' }]; }
  headings() { return ['ID', 'Name']; }
  autoFilter() { return true as const; }
}

class AutoFilterStringExport implements Exportable, WithAutoFilter {
  async collection() { return [{ id: 1 }]; }
  autoFilter() { return 'A1:C1'; }
}

class FrozenRowsExport implements Exportable, WithFrozenRows {
  async collection() { return [{ id: 1 }]; }
  frozenRows() { return 2; }
}

class FrozenColsExport implements Exportable, WithFrozenColumns {
  async collection() { return [{ id: 1 }]; }
  frozenColumns() { return 3; }
}

class FrozenBothExport implements Exportable, WithFrozenRows, WithFrozenColumns {
  async collection() { return [{ id: 1 }]; }
  frozenRows() { return 1; }
  frozenColumns() { return 2; }
}

class TabColorExport implements Exportable, WithTabColor {
  async collection() { return [{ id: 1 }]; }
  tabColor() { return 'FF0000FF'; }
}

class ColWidthExport implements Exportable, WithColumnWidths {
  async collection() { return [{ id: 1, name: 'Alice' }]; }
  columnWidths() { return { '1': 20, '2': 40 }; }
}

class RowHeightExport implements Exportable, WithRowHeights {
  async collection() { return [{ id: 1 }]; }
  rowHeights() { return { 2: 30 }; }
}

class ProtectionStringExport implements Exportable, WithProtection {
  async collection() { return [{ id: 1 }]; }
  protection() { return 'secret123'; }
}

class ProtectionObjectExport implements Exportable, WithProtection {
  async collection() { return [{ id: 1 }]; }
  protection() {
    return { password: 'pass', selectLockedCells: false } as Parameters<
      WithProtection['protection']
    >[0];
  }
}

class ConditionalExport implements Exportable, WithConditionalFormatting {
  async collection() { return [{ val: 1 }]; }
  conditionalFormats(): ConditionalFormattingRule[] {
    return [{ ref: 'A2:A10', rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: ['0'], priority: 1 }] }];
  }
}

// ---------------------------------------------------------------------------
// Test helpers — import classes
// ---------------------------------------------------------------------------

class BasicImport implements Importable {
  readonly modelFn = vi.fn();
  async model(row: Record<string, unknown>): Promise<void> {
    this.modelFn(row);
  }
}

class BatchImport implements Importable, WithBatchInserts {
  readonly batchFn = vi.fn().mockResolvedValue(undefined);
  async model(_row: Record<string, unknown>): Promise<void> {}
  batchSize() { return 10; }
  async batchInsert(rows: Record<string, unknown>[]) {
    await this.batchFn(rows);
  }
}

class EventImport implements Importable, BeforeImport, AfterImport {
  readonly before = vi.fn();
  readonly after = vi.fn();
  async model(_row: Record<string, unknown>): Promise<void> {}
  beforeImport(wb: ExcelJS.Workbook): void { this.before(wb); }
  afterImport(wb: ExcelJS.Workbook): void { this.after(wb); }
}

class StartRowImport implements Importable, WithStartRow {
  readonly modelFn = vi.fn();
  startRow() { return 3; }
  async model(row: Record<string, unknown>): Promise<void> { this.modelFn(row); }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@lara-node/excel — Excel class', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddRow.mockReturnValue({ commit: mockCommit, eachCell: vi.fn() });
    mockGetRow.mockReturnValue({ eachCell: vi.fn(), commit: mockCommit, height: 0 });
    mockGetColumn.mockReturnValue({ numFmt: '', alignment: {}, width: 0 });
    mockWorkbook.addWorksheet.mockReturnValue(mockWorksheet);
    mockWriteBuffer.mockResolvedValue(Buffer.from('XLSX-mock'));
    mockProtect.mockResolvedValue(undefined);
    Object.assign(mockWorksheet, {
      rowCount: 0,
      getRow: mockGetRow,
      protect: mockProtect,
      addConditionalFormatting: mockAddConditionalFormatting,
      properties: {},
      views: [],
      autoFilter: '',
    });
    // Reset worksheets to always have one
    mockWorkbook.worksheets.length = 0;
    mockWorkbook.worksheets.push(mockWorksheet);
  });

  // -------------------------------------------------------------------------
  // raw
  // -------------------------------------------------------------------------

  describe('raw', () => {
    it('returns a Buffer', async () => {
      const buf = await Excel.raw(new BasicExport());
      expect(buf).toBeInstanceOf(Buffer);
    });

    it('adds rows from collection', async () => {
      await Excel.raw(new BasicExport());
      expect(mockAddRow).toHaveBeenCalledTimes(2);
    });

    it('adds heading row first when WithHeadings is implemented', async () => {
      await Excel.raw(new HeadedExport());
      const calls = mockAddRow.mock.calls.map((c) => c[0]);
      expect(calls[0]).toEqual(['ID', 'Name']);
      expect(calls[1]).toEqual([1, 'Alice']);
    });

    it('maps rows through WithMapping', async () => {
      await Excel.raw(new MappedExport());
      const calls = mockAddRow.mock.calls.map((c) => c[0]);
      // First call is headings, second is mapped row
      expect(calls[1]).toEqual([1, 'Alice', '$199.99']);
    });

    it('calls styles() after writing rows', async () => {
      const stylesSpy = vi.spyOn(StyledExport.prototype, 'styles');
      await Excel.raw(new StyledExport());
      expect(stylesSpy).toHaveBeenCalledWith(mockWorksheet);
    });

    it('applies column formats', async () => {
      await Excel.raw(new FormattedExport());
      expect(mockGetColumn).toHaveBeenCalledWith(1);
    });

    it('uses custom sheet name from WithTitle', async () => {
      await Excel.raw(new TitledExport());
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Custom Sheet');
    });

    it('calls onRow for each data row', async () => {
      const exp = new EventExport();
      await Excel.raw(exp);
      expect(exp.rowCallback).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Multiple sheets
  // -------------------------------------------------------------------------

  describe('WithMultipleSheets', () => {
    it('creates one worksheet per sheet', async () => {
      await Excel.raw(new MultiSheet());
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(2);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Invoices');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Summary');
    });
  });

  // -------------------------------------------------------------------------
  // WithProperties
  // -------------------------------------------------------------------------

  describe('WithProperties', () => {
    it('assigns workbook properties', async () => {
      class PropExport implements Exportable, WithProperties {
        async collection() { return []; }
        properties(): Partial<ExcelJS.WorkbookProperties> {
          return { creator: 'Alice', title: 'Report' } as Partial<ExcelJS.WorkbookProperties>;
        }
      }
      await Excel.raw(new PropExport());
      expect(mockWorkbook.properties).toMatchObject({ creator: 'Alice', title: 'Report' });
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — WithTabColor
  // -------------------------------------------------------------------------

  describe('WithTabColor', () => {
    it('sets worksheet tab color', async () => {
      await Excel.raw(new TabColorExport());
      expect(mockWorksheet.properties).toMatchObject({ tabColor: { argb: 'FF0000FF' } });
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — WithColumnWidths
  // -------------------------------------------------------------------------

  describe('WithColumnWidths', () => {
    it('calls getColumn for each column key', async () => {
      await Excel.raw(new ColWidthExport());
      expect(mockGetColumn).toHaveBeenCalledWith(1);
      expect(mockGetColumn).toHaveBeenCalledWith(2);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — WithRowHeights
  // -------------------------------------------------------------------------

  describe('WithRowHeights', () => {
    it('calls getRow and commit for each specified row', async () => {
      await Excel.raw(new RowHeightExport());
      // row 2 is called once for height adjustment
      expect(mockGetRow).toHaveBeenCalledWith(2);
      expect(mockCommit).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — WithAutoFilter
  // -------------------------------------------------------------------------

  describe('WithAutoFilter', () => {
    it('sets autoFilter range from headings when autoFilter() returns true', async () => {
      await Excel.raw(new AutoFilterBoolExport());
      // 2 headings → A1:B1
      expect(mockWorksheet.autoFilter).toBe('A1:B1');
    });

    it('uses the string value directly when autoFilter() returns a range string', async () => {
      await Excel.raw(new AutoFilterStringExport());
      expect(mockWorksheet.autoFilter).toBe('A1:C1');
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — WithFrozenRows / WithFrozenColumns
  // -------------------------------------------------------------------------

  describe('WithFrozenRows', () => {
    it('sets worksheet views with frozen rows', async () => {
      await Excel.raw(new FrozenRowsExport());
      expect(mockWorksheet.views).toEqual([
        { state: 'frozen', xSplit: 0, ySplit: 2 },
      ]);
    });
  });

  describe('WithFrozenColumns', () => {
    it('sets worksheet views with frozen columns', async () => {
      await Excel.raw(new FrozenColsExport());
      expect(mockWorksheet.views).toEqual([
        { state: 'frozen', xSplit: 3, ySplit: 0 },
      ]);
    });
  });

  describe('WithFrozenRows + WithFrozenColumns', () => {
    it('sets both xSplit and ySplit on the views', async () => {
      await Excel.raw(new FrozenBothExport());
      expect(mockWorksheet.views).toEqual([
        { state: 'frozen', xSplit: 2, ySplit: 1 },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — WithProtection
  // -------------------------------------------------------------------------

  describe('WithProtection', () => {
    it('calls worksheet.protect with the password string', async () => {
      await Excel.raw(new ProtectionStringExport());
      expect(mockProtect).toHaveBeenCalledWith('secret123', {});
    });

    it('calls worksheet.protect with password and options from object', async () => {
      await Excel.raw(new ProtectionObjectExport());
      expect(mockProtect).toHaveBeenCalledWith(
        'pass',
        expect.objectContaining({ selectLockedCells: false }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — WithConditionalFormatting
  // -------------------------------------------------------------------------

  describe('WithConditionalFormatting', () => {
    it('calls addConditionalFormatting with the rule ref', async () => {
      await Excel.raw(new ConditionalExport());
      expect(mockAddConditionalFormatting).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'A2:A10' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // download
  // -------------------------------------------------------------------------

  describe('download', () => {
    it('sets correct response headers', async () => {
      const res = { setHeader: vi.fn(), end: vi.fn() };
      await Excel.download(new BasicExport(), 'export.xlsx', res as unknown as import('express').Response);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="export.xlsx"',
      );
      expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  // -------------------------------------------------------------------------
  // store
  // -------------------------------------------------------------------------

  describe('store', () => {
    it('writes buffer to file', async () => {
      await Excel.store(new BasicExport(), '/tmp/export.xlsx');
      expect(mockWriteFile).toHaveBeenCalledWith('/tmp/export.xlsx', expect.any(Buffer));
    });
  });

  // -------------------------------------------------------------------------
  // queue
  // -------------------------------------------------------------------------

  describe('queue', () => {
    it('writes file to outputDir/filename', async () => {
      await Excel.queue(new BasicExport(), 'invoices.xlsx', '/storage/exports');
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/storage/exports/invoices.xlsx',
        expect.any(Buffer),
      );
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — base64
  // -------------------------------------------------------------------------

  describe('base64', () => {
    it('returns a base64-encoded string', async () => {
      const result = await Excel.base64(new BasicExport());
      expect(typeof result).toBe('string');
      const decoded = Buffer.from(result, 'base64');
      expect(decoded.toString()).toBe('XLSX-mock');
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — sheets
  // -------------------------------------------------------------------------

  describe('sheets', () => {
    it('returns an array of worksheet names from a file path', async () => {
      Object.assign(mockWorksheet, { name: 'Invoices' });
      const names = await Excel.sheets('/path/to/file.xlsx');
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/file.xlsx');
      expect(names).toEqual(['Invoices']);
    });

    it('uses xlsx.load() when source is a buffer', async () => {
      const buf = Buffer.from('fake-xlsx');
      await Excel.sheets(buf, { type: 'buffer' });
      expect(mockLoad).toHaveBeenCalledWith(buf);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — fromArray
  // -------------------------------------------------------------------------

  describe('fromArray', () => {
    it('creates a Buffer from an array of plain objects', async () => {
      const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      const buf = await Excel.fromArray(data);
      expect(buf).toBeInstanceOf(Buffer);
    });

    it('adds a header row using object keys', async () => {
      const data = [{ id: 1, name: 'Alice' }];
      await Excel.fromArray(data);
      const calls = mockAddRow.mock.calls.map((c) => c[0]);
      expect(calls[0]).toEqual(['id', 'name']);
    });

    it('adds data rows after the header', async () => {
      const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      await Excel.fromArray(data);
      const calls = mockAddRow.mock.calls.map((c) => c[0]);
      expect(calls[1]).toEqual([1, 'Alice']);
      expect(calls[2]).toEqual([2, 'Bob']);
    });

    it('accepts explicit headers option', async () => {
      const data = [{ id: 1, name: 'Alice', email: 'a@b.com' }];
      await Excel.fromArray(data, { headers: ['id', 'name'] });
      const calls = mockAddRow.mock.calls.map((c) => c[0]);
      expect(calls[0]).toEqual(['id', 'name']);
      expect(calls[1]).toEqual([1, 'Alice']);
    });

    it('uses custom sheet name when provided', async () => {
      await Excel.fromArray([{ x: 1 }], { sheetName: 'MySheet' });
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('MySheet');
    });
  });

  // -------------------------------------------------------------------------
  // v0.2.0 — toArray
  // -------------------------------------------------------------------------

  describe('toArray', () => {
    beforeEach(() => {
      const headingCells = [{ value: 'Name' }, { value: 'Score' }];
      const dataRow1 = [{ value: 'Alice' }, { value: 95 }];
      const dataRow2 = [{ value: 'Bob' }, { value: 80 }];

      const makeEachCell =
        (cells: Array<{ value: unknown }>) =>
        (cb: (cell: { value: unknown }, col: number) => void) => {
          cells.forEach((c, i) => cb(c, i + 1));
        };

      Object.assign(mockWorksheet, {
        rowCount: 3,
        getRow: vi.fn().mockImplementation((n: number) => ({
          eachCell: makeEachCell(
            n === 1 ? headingCells : n === 2 ? dataRow1 : dataRow2,
          ),
          commit: mockCommit,
        })),
      });
    });

    it('reads the file and returns an array of objects', async () => {
      const rows = await Excel.toArray('/path/file.xlsx');
      expect(mockReadFile).toHaveBeenCalledWith('/path/file.xlsx');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ Name: 'Alice', Score: 95 });
      expect(rows[1]).toMatchObject({ Name: 'Bob', Score: 80 });
    });

    it('uses xlsx.load() when source is a buffer', async () => {
      const buf = Buffer.from('fake-xlsx');
      await Excel.toArray(buf, 0, { type: 'buffer' });
      expect(mockLoad).toHaveBeenCalledWith(buf);
    });

    it('returns empty array when worksheet is not found', async () => {
      mockWorkbook.worksheets.length = 0;
      const rows = await Excel.toArray('/path/file.xlsx', 5);
      expect(rows).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // import (file path)
  // -------------------------------------------------------------------------

  describe('import — file path', () => {
    beforeEach(() => {
      const headingCells = [{ value: 'Name' }, { value: 'Email' }];
      const dataRow1 = [{ value: 'Alice' }, { value: 'alice@example.com' }];

      const makeEachCell =
        (cells: Array<{ value: unknown }>) =>
        (cb: (cell: { value: unknown }, col: number) => void) => {
          cells.forEach((c, i) => cb(c, i + 1));
        };

      Object.assign(mockWorksheet, {
        rowCount: 2,
        getRow: vi.fn().mockImplementation((n: number) => ({
          eachCell: makeEachCell(n === 1 ? headingCells : dataRow1),
          commit: mockCommit,
        })),
      });
    });

    it('calls readFile with the provided path', async () => {
      const imp = new BasicImport();
      await Excel.import(imp, '/path/to/users.xlsx');
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/users.xlsx');
    });

    it('calls model for each data row', async () => {
      const imp = new BasicImport();
      await Excel.import(imp, '/path/to/users.xlsx');
      expect(imp.modelFn).toHaveBeenCalledTimes(1);
      expect(imp.modelFn).toHaveBeenCalledWith(
        expect.objectContaining({ Name: 'Alice', Email: 'alice@example.com' }),
      );
    });

    it('calls beforeImport and afterImport hooks', async () => {
      const imp = new EventImport();
      await Excel.import(imp, '/path/to/data.xlsx');
      expect(imp.before).toHaveBeenCalledWith(mockWorkbook);
      expect(imp.after).toHaveBeenCalledWith(mockWorkbook);
    });
  });

  // -------------------------------------------------------------------------
  // import — buffer
  // -------------------------------------------------------------------------

  describe('import — buffer', () => {
    it('uses workbook.xlsx.load() for buffer source', async () => {
      Object.assign(mockWorksheet, { rowCount: 0 });
      const buf = Buffer.from('fake-xlsx');
      const imp = new BasicImport();
      await Excel.import(imp, buf, { type: 'buffer' });
      expect(mockLoad).toHaveBeenCalledWith(buf);
    });
  });

  // -------------------------------------------------------------------------
  // import — batch inserts
  // -------------------------------------------------------------------------

  describe('import — WithBatchInserts', () => {
    beforeEach(() => {
      const headingCells = [{ value: 'ID' }];
      const makeDataRow = (id: number) => [{ value: id }];
      const makeEachCell =
        (cells: Array<{ value: unknown }>) =>
        (cb: (cell: { value: unknown }, col: number) => void) => {
          cells.forEach((c, i) => cb(c, i + 1));
        };

      Object.assign(mockWorksheet, {
        rowCount: 6, // 1 heading + 5 data
        getRow: vi.fn().mockImplementation((n: number) => ({
          eachCell: makeEachCell(n === 1 ? headingCells : makeDataRow(n)),
          commit: mockCommit,
        })),
      });
    });

    it('flushes remaining batch at end', async () => {
      const imp = new BatchImport(); // batchSize = 10, 5 rows < 10
      await Excel.import(imp, '/data.xlsx');
      expect(imp.batchFn).toHaveBeenCalledTimes(1);
      expect(imp.batchFn.mock.calls[0][0]).toHaveLength(5);
    });
  });
});
