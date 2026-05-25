import ExcelJS from 'exceljs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Response } from 'express';
import type { Exportable } from './concerns/Exportable.js';
import type { WithHeadings } from './concerns/WithHeadings.js';
import type { WithMapping } from './concerns/WithMapping.js';
import type { WithStyles } from './concerns/WithStyles.js';
import type { WithColumnFormatting } from './concerns/WithColumnFormatting.js';
import type { WithMultipleSheets } from './concerns/WithMultipleSheets.js';
import type { WithTitle } from './concerns/WithTitle.js';
import type { WithProperties } from './concerns/WithProperties.js';
import type { WithEvents } from './concerns/WithEvents.js';
import type { Importable } from './concerns/Importable.js';
import type { WithBatchInserts } from './concerns/WithBatchInserts.js';
import type { WithChunkReading } from './concerns/WithChunkReading.js';
import type { BeforeImport } from './concerns/BeforeImport.js';
import type { AfterImport } from './concerns/AfterImport.js';
import type { WithStartRow } from './concerns/WithStartRow.js';
import type { WithAutoFilter } from './concerns/WithAutoFilter.js';
import type { WithFrozenRows } from './concerns/WithFrozenRows.js';
import type { WithFrozenColumns } from './concerns/WithFrozenColumns.js';
import type { WithTabColor } from './concerns/WithTabColor.js';
import type { WithColumnWidths } from './concerns/WithColumnWidths.js';
import type { WithRowHeights } from './concerns/WithRowHeights.js';
import type { WithProtection } from './concerns/WithProtection.js';
import type { WithConditionalFormatting } from './concerns/WithConditionalFormatting.js';
import type { ImportSourceOptions, FromArrayOptions } from './types.js';

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function hasHeadings(obj: unknown): obj is WithHeadings {
  return typeof (obj as WithHeadings).headings === 'function';
}
function hasMapping(obj: unknown): obj is WithMapping {
  return typeof (obj as WithMapping).map === 'function';
}
function hasStyles(obj: unknown): obj is WithStyles {
  return typeof (obj as WithStyles).styles === 'function';
}
function hasColumnFormatting(obj: unknown): obj is WithColumnFormatting {
  return typeof (obj as WithColumnFormatting).columnFormats === 'function';
}
function hasTitle(obj: unknown): obj is WithTitle {
  return typeof (obj as WithTitle).title === 'function';
}
function hasProperties(obj: unknown): obj is WithProperties {
  return typeof (obj as WithProperties).properties === 'function';
}
function hasEvents(obj: unknown): obj is WithEvents {
  return typeof (obj as WithEvents).onRow === 'function';
}
function hasMultipleSheets(obj: unknown): obj is WithMultipleSheets {
  return typeof (obj as WithMultipleSheets).sheets === 'function';
}
function hasBatchInserts(obj: unknown): obj is WithBatchInserts {
  return (
    typeof (obj as WithBatchInserts).batchSize === 'function' &&
    typeof (obj as WithBatchInserts).batchInsert === 'function'
  );
}
function hasStartRow(obj: unknown): obj is WithStartRow {
  return typeof (obj as WithStartRow).startRow === 'function';
}
function hasBeforeImport(obj: unknown): obj is BeforeImport {
  return typeof (obj as BeforeImport).beforeImport === 'function';
}
function hasAfterImport(obj: unknown): obj is AfterImport {
  return typeof (obj as AfterImport).afterImport === 'function';
}
function hasAutoFilter(obj: unknown): obj is WithAutoFilter {
  return typeof (obj as WithAutoFilter).autoFilter === 'function';
}
function hasFrozenRows(obj: unknown): obj is WithFrozenRows {
  return typeof (obj as WithFrozenRows).frozenRows === 'function';
}
function hasFrozenColumns(obj: unknown): obj is WithFrozenColumns {
  return typeof (obj as WithFrozenColumns).frozenColumns === 'function';
}
function hasTabColor(obj: unknown): obj is WithTabColor {
  return typeof (obj as WithTabColor).tabColor === 'function';
}
function hasColumnWidths(obj: unknown): obj is WithColumnWidths {
  return typeof (obj as WithColumnWidths).columnWidths === 'function';
}
function hasRowHeights(obj: unknown): obj is WithRowHeights {
  return typeof (obj as WithRowHeights).rowHeights === 'function';
}
function hasProtection(obj: unknown): obj is WithProtection {
  return typeof (obj as WithProtection).protection === 'function';
}
function hasConditionalFormatting(obj: unknown): obj is WithConditionalFormatting {
  return typeof (obj as WithConditionalFormatting).conditionalFormats === 'function';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function buildWorkbook(exportable: Exportable | WithMultipleSheets): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  if (hasProperties(exportable)) {
    Object.assign(workbook.properties, exportable.properties());
  }

  if (hasMultipleSheets(exportable)) {
    const sheets = exportable.sheets();
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const name =
        hasTitle(sheet) ? sheet.title() : `Sheet${i + 1}`;
      await populateSheet(workbook.addWorksheet(name), sheet);
    }
  } else {
    const sheetName = hasTitle(exportable) ? (exportable as WithTitle).title() : 'Sheet1';
    await populateSheet(workbook.addWorksheet(sheetName), exportable as Exportable);
  }

  return workbook;
}

async function populateSheet(
  worksheet: ExcelJS.Worksheet,
  exportable: Exportable,
): Promise<void> {
  const collection = await Promise.resolve(exportable.collection());

  // Tab colour
  if (hasTabColor(exportable)) {
    worksheet.properties.tabColor = { argb: exportable.tabColor() };
  }

  // Headings row
  if (hasHeadings(exportable)) {
    const headingRow = worksheet.addRow(exportable.headings());
    headingRow.commit();
  }

  // Column formats
  if (hasColumnFormatting(exportable)) {
    const formats = exportable.columnFormats();
    for (const [key, fmt] of Object.entries(formats)) {
      const colIndex = Number(key);
      const col = isNaN(colIndex)
        ? worksheet.getColumn(key)
        : worksheet.getColumn(colIndex);
      col.numFmt = fmt;
    }
  }

  // Column widths
  if (hasColumnWidths(exportable)) {
    const widths = exportable.columnWidths();
    for (const [key, width] of Object.entries(widths)) {
      const colIndex = Number(key);
      const col = isNaN(colIndex)
        ? worksheet.getColumn(key)
        : worksheet.getColumn(colIndex);
      col.width = width;
    }
  }

  // Data rows
  for (const rawRow of collection) {
    const values = hasMapping(exportable) ? exportable.map(rawRow) : Object.values(rawRow);
    const exRow = worksheet.addRow(values);
    if (hasEvents(exportable) && exportable.onRow) {
      exportable.onRow(exRow, rawRow);
    }
    exRow.commit();
  }

  // Row heights
  if (hasRowHeights(exportable)) {
    const heights = exportable.rowHeights();
    for (const [rowNum, height] of Object.entries(heights)) {
      const row = worksheet.getRow(Number(rowNum));
      row.height = height;
      row.commit();
    }
  }

  // Styles (after rows so row counts are known)
  if (hasStyles(exportable)) {
    exportable.styles(worksheet);
  }

  // Auto filter
  if (hasAutoFilter(exportable)) {
    const af = exportable.autoFilter();
    if (af === true && hasHeadings(exportable)) {
      const headings = exportable.headings();
      const lastCol = ExcelJS.utils
        ? String.fromCharCode(64 + headings.length)
        : String.fromCharCode(64 + headings.length);
      worksheet.autoFilter = `A1:${lastCol}1`;
    } else if (typeof af === 'string') {
      worksheet.autoFilter = af;
    }
  }

  // Frozen rows / columns
  const frozenRows = hasFrozenRows(exportable) ? exportable.frozenRows() : 0;
  const frozenCols = hasFrozenColumns(exportable) ? exportable.frozenColumns() : 0;
  if (frozenRows > 0 || frozenCols > 0) {
    worksheet.views = [{ state: 'frozen', xSplit: frozenCols, ySplit: frozenRows }];
  }

  // Sheet protection
  if (hasProtection(exportable)) {
    const prot = exportable.protection();
    if (typeof prot === 'string') {
      await worksheet.protect(prot, {});
    } else {
      const { password, ...opts } = prot;
      await worksheet.protect(password ?? '', opts);
    }
  }

  // Conditional formatting
  if (hasConditionalFormatting(exportable)) {
    for (const rule of exportable.conditionalFormats()) {
      worksheet.addConditionalFormatting({
        ref: rule.ref,
        rules: rule.rules as ExcelJS.ConditionalFormattingRule[],
      });
    }
  }
}

async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Main Excel class
// ---------------------------------------------------------------------------

/**
 * Facade for Excel export and import operations.
 */
export class Excel {
  /**
   * Send an Excel file as a download via an Express response.
   *
   * @param exportable - An instance implementing `Exportable` (or `WithMultipleSheets`).
   * @param filename - Suggested filename for the download.
   * @param res - Express Response object.
   */
  static async download(
    exportable: Exportable | WithMultipleSheets,
    filename: string,
    res: Response,
  ): Promise<void> {
    const buf = await Excel.raw(exportable);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buf.length.toString());
    res.end(buf);
  }

  /**
   * Save an Excel file to disk.
   *
   * @param exportable - An instance implementing `Exportable` (or `WithMultipleSheets`).
   * @param filePath - Absolute destination path.
   */
  static async store(
    exportable: Exportable | WithMultipleSheets,
    filePath: string,
  ): Promise<void> {
    const buf = await Excel.raw(exportable);
    await writeFile(filePath, buf);
  }

  /**
   * Generate and return the Excel file as a Buffer.
   *
   * @param exportable - An instance implementing `Exportable` (or `WithMultipleSheets`).
   */
  static async raw(exportable: Exportable | WithMultipleSheets): Promise<Buffer> {
    const workbook = await buildWorkbook(exportable);
    return workbookToBuffer(workbook);
  }

  /**
   * Queue an export job (generates the file and writes it to outputDir).
   * Returns a Promise suitable for background processing.
   *
   * @param exportable - An instance implementing `Exportable` (or `WithMultipleSheets`).
   * @param filename - Name for the output file.
   * @param outputDir - Directory path to write the file to.
   */
  static async queue(
    exportable: Exportable | WithMultipleSheets,
    filename: string,
    outputDir: string,
  ): Promise<void> {
    const filePath = join(outputDir, filename);
    await Excel.store(exportable, filePath);
  }

  /**
   * Generate and return the Excel file as a base64-encoded string.
   *
   * @param exportable - An instance implementing `Exportable` (or `WithMultipleSheets`).
   */
  static async base64(exportable: Exportable | WithMultipleSheets): Promise<string> {
    const buf = await Excel.raw(exportable);
    return buf.toString('base64');
  }

  /**
   * List the sheet names from an Excel file or buffer.
   *
   * @param source - Absolute file path or a Buffer when `options.type === 'buffer'`.
   * @param options - Import source options.
   */
  static async sheets(source: string | Buffer, options?: ImportSourceOptions): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    if (options?.type === 'buffer' && Buffer.isBuffer(source)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(source as any);
    } else {
      await workbook.xlsx.readFile(source as string);
    }
    return workbook.worksheets.map((ws) => ws.name);
  }

  /**
   * Create an Excel workbook from a plain array of objects — no export class needed.
   *
   * @param data - Array of row objects.
   * @param options - Optional sheet title and explicit column headers.
   */
  static async fromArray(
    data: Record<string, unknown>[],
    options?: FromArrayOptions,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(options?.sheetName ?? 'Sheet1');

    const headers = options?.headers ?? (data.length > 0 ? Object.keys(data[0]) : []);
    if (headers.length > 0) {
      const hRow = sheet.addRow(headers);
      hRow.commit();
    }
    for (const row of data) {
      const values = headers.length > 0
        ? headers.map((h) => row[h])
        : Object.values(row);
      const r = sheet.addRow(values);
      r.commit();
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Parse an Excel file or buffer into an array of plain objects.
   * Uses the first row as column headers.
   *
   * @param source - Absolute file path or a Buffer when `options.type === 'buffer'`.
   * @param sheetIndex - 0-based sheet index to read. Default: 0.
   * @param options - Import source options.
   */
  static async toArray(
    source: string | Buffer,
    sheetIndex = 0,
    options?: ImportSourceOptions,
  ): Promise<Record<string, unknown>[]> {
    const workbook = new ExcelJS.Workbook();
    if (options?.type === 'buffer' && Buffer.isBuffer(source)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(source as any);
    } else {
      await workbook.xlsx.readFile(source as string);
    }

    const worksheet = workbook.worksheets[sheetIndex];
    if (!worksheet) return [];

    const headingRow = worksheet.getRow(1);
    const headers: string[] = [];
    headingRow.eachCell((cell, colNum) => {
      headers[colNum - 1] = String(cell.value ?? `col${colNum}`);
    });

    const result: Record<string, unknown>[] = [];
    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      let isEmpty = true;
      row.eachCell(() => { isEmpty = false; });
      if (isEmpty) continue;
      const record: Record<string, unknown> = {};
      row.eachCell((cell, colNum) => {
        const header = headers[colNum - 1] ?? `col${colNum}`;
        record[header] = cell.value;
      });
      result.push(record);
    }
    return result;
  }

  /**
   * Import rows from an Excel file or buffer.
   *
   * @param importable - An instance implementing `Importable`.
   * @param source - Absolute file path or a Buffer when `options.type === 'buffer'`.
   * @param options - Additional import options.
   */
  static async import(
    importable: Importable,
    source: string | Buffer,
    options?: ImportSourceOptions,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    if (options?.type === 'buffer' && Buffer.isBuffer(source)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(source as any);
    } else {
      await workbook.xlsx.readFile(source as string);
    }

    if (hasBeforeImport(importable)) {
      importable.beforeImport(workbook);
    }

    const startRow = hasStartRow(importable) ? importable.startRow() : 2;
    const chunkSize = hasBatchInserts(importable) ? importable.batchSize() : 0;

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      if (hasAfterImport(importable)) {
        importable.afterImport(workbook);
      }
      return;
    }

    // Read heading row to build keyed objects
    const headingRow = worksheet.getRow(1);
    const headers: string[] = [];
    headingRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? `col${colNumber}`);
    });

    let batch: Record<string, unknown>[] = [];

    for (let rowNum = startRow; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      // Skip completely empty rows
      let isEmpty = true;
      row.eachCell(() => { isEmpty = false; });
      if (isEmpty) continue;

      const record: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1] ?? `col${colNumber}`;
        record[header] = cell.value;
      });

      if (hasBatchInserts(importable) && chunkSize > 0) {
        batch.push(record);
        if (batch.length >= chunkSize) {
          await importable.batchInsert(batch);
          batch = [];
        }
      } else {
        await Promise.resolve(importable.model(record));
      }
    }

    // Flush remaining batch
    if (hasBatchInserts(importable) && batch.length > 0) {
      await importable.batchInsert(batch);
    }

    if (hasAfterImport(importable)) {
      importable.afterImport(workbook);
    }
  }
}
