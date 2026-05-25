import { readFile, writeFile } from 'node:fs/promises';
import type { Response } from 'express';
import { CsvWriter } from './CsvWriter.js';
import { CsvReader } from './CsvReader.js';
import type { CsvExportable } from './concerns/CsvExportable.js';
import type { WithCsvHeadings } from './concerns/WithCsvHeadings.js';
import type { WithCsvMapping } from './concerns/WithCsvMapping.js';
import type { WithCsvEncoding } from './concerns/WithCsvEncoding.js';
import type { CsvImportable } from './concerns/CsvImportable.js';
import type { WithCsvStartRow } from './concerns/WithCsvStartRow.js';
import type { WithCsvValidation } from './concerns/WithCsvValidation.js';
import type { WithCsvTransform } from './concerns/WithCsvTransform.js';
import type { WithCsvFilters } from './concerns/WithCsvFilters.js';
import type { WithCsvSorting } from './concerns/WithCsvSorting.js';
import type {
  CsvOptions,
  FromArrayOptions,
  ParseOptions,
  ImportSourceOptions,
  StreamOptions,
  MergeOptions,
  CountOptions,
  ColumnStats,
} from './types.js';

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function hasCsvHeadings(obj: unknown): obj is WithCsvHeadings {
  return typeof (obj as WithCsvHeadings).headings === 'function';
}
function hasCsvMapping(obj: unknown): obj is WithCsvMapping {
  return typeof (obj as WithCsvMapping).map === 'function';
}
function hasCsvEncoding(obj: unknown): obj is WithCsvEncoding {
  return typeof (obj as WithCsvEncoding).encoding === 'function';
}
function hasCsvStartRow(obj: unknown): obj is WithCsvStartRow {
  return typeof (obj as WithCsvStartRow).startRow === 'function';
}
function hasCsvValidation(obj: unknown): obj is WithCsvValidation {
  return typeof (obj as WithCsvValidation).validate === 'function';
}
function hasCsvTransform(obj: unknown): obj is WithCsvTransform {
  return typeof (obj as WithCsvTransform).transform === 'function';
}
function hasCsvFilters(obj: unknown): obj is WithCsvFilters {
  return typeof (obj as WithCsvFilters).filter === 'function';
}
function hasCsvSorting(obj: unknown): obj is WithCsvSorting {
  return typeof (obj as WithCsvSorting).sortBy === 'function';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildCsvString(
  exportable: CsvExportable,
  options: CsvOptions = {},
): Promise<string> {
  let collection = await Promise.resolve(exportable.collection());

  if (hasCsvSorting(exportable)) {
    collection = [...collection].sort(exportable.sortBy());
  }

  if (hasCsvFilters(exportable)) {
    const filtered: Record<string, unknown>[] = [];
    for (let i = 0; i < collection.length; i++) {
      if (await Promise.resolve(exportable.filter(collection[i], i))) {
        filtered.push(collection[i]);
      }
    }
    collection = filtered;
  }

  if (hasCsvTransform(exportable)) {
    const transformed: Record<string, unknown>[] = [];
    for (let i = 0; i < collection.length; i++) {
      transformed.push(await Promise.resolve(exportable.transform(collection[i], i)));
    }
    collection = transformed;
  }

  const encoding = hasCsvEncoding(exportable)
    ? exportable.encoding()
    : options.encoding ?? 'utf-8';

  const writer = new CsvWriter({ ...options, encoding });

  const headers = hasCsvHeadings(exportable)
    ? exportable.headings()
    : !hasCsvMapping(exportable) && collection.length > 0
      ? Object.keys(collection[0] as Record<string, unknown>)
      : undefined;

  const rows = collection.map((row) =>
    hasCsvMapping(exportable) ? exportable.map(row) : Object.values(row),
  );

  return writer.serialize(rows, headers);
}

// ---------------------------------------------------------------------------
// Main CSV facade
// ---------------------------------------------------------------------------

/**
 * Facade for CSV export and import operations.
 */
export class CSV {
  /**
   * Send a CSV file as a download via an Express response.
   *
   * @param exportable - An instance implementing `CsvExportable`.
   * @param filename - Suggested filename.
   * @param res - Express Response object.
   * @param options - Additional CSV options.
   */
  static async download(
    exportable: CsvExportable,
    filename: string,
    res: Response,
    options?: CsvOptions,
  ): Promise<void> {
    const csv = await buildCsvString(exportable, options);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf-8').toString());
    res.end(csv);
  }

  /**
   * Save a CSV file to disk.
   *
   * @param exportable - An instance implementing `CsvExportable`.
   * @param filePath - Absolute destination path.
   * @param options - Additional CSV options.
   */
  static async store(
    exportable: CsvExportable,
    filePath: string,
    options?: CsvOptions,
  ): Promise<void> {
    const csv = await buildCsvString(exportable, options);
    await writeFile(filePath, csv, 'utf-8');
  }

  /**
   * Generate and return the CSV as a string.
   *
   * @param exportable - An instance implementing `CsvExportable`.
   * @param options - Additional CSV options.
   */
  static async raw(exportable: CsvExportable, options?: CsvOptions): Promise<string> {
    return buildCsvString(exportable, options);
  }

  /**
   * Import rows from a CSV file or string.
   *
   * @param importable - An instance implementing `CsvImportable`.
   * @param source - Absolute file path or a CSV string when `options.type === 'string'`.
   * @param options - Import and CSV options.
   */
  static async import(
    importable: CsvImportable,
    source: string,
    options?: ImportSourceOptions & ParseOptions,
  ): Promise<void> {
    const csvString =
      options?.type === 'string' ? source : await readFile(source, 'utf-8');

    // startRow is 1-based; default=2 means skip first (header) row
    const startRow = hasCsvStartRow(importable) ? importable.startRow() : 2;

    const reader = new CsvReader({
      delimiter: options?.delimiter,
      headers: options?.headers !== false,
      quoteChar: options?.quoteChar,
    });

    const allRows = reader.parse(csvString);

    // If startRow > 2, skip additional rows (rows are already 0-indexed after header stripping)
    const dataRows = startRow > 2 ? allRows.slice(startRow - 2) : allRows;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      if (hasCsvValidation(importable)) {
        const result = await Promise.resolve(importable.validate(row, i));
        if (result === false) continue;
        if (typeof result === 'string') throw new Error(result);
      }

      await Promise.resolve(importable.model(row));
    }
  }

  /**
   * Parse a CSV Buffer into an array of keyed records.
   *
   * @param buf - Buffer containing CSV content (UTF-8 or UTF-8 BOM).
   * @param options - Parse options.
   */
  static parseBuffer(buf: Buffer, options?: ParseOptions): Record<string, string>[] {
    const str = buf.toString('utf-8');
    return CSV.parse(str, options);
  }

  /**
   * Serialize a CSV string to a Node.js Buffer.
   *
   * @param exportable - An instance implementing `CsvExportable`.
   * @param options - CSV options.
   */
  static async toBuffer(exportable: CsvExportable, options?: CsvOptions): Promise<Buffer> {
    const csv = await buildCsvString(exportable, options);
    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Count the number of data rows in a CSV string (excludes the header row by default).
   *
   * @param csv - Raw CSV string.
   * @param options - Count options.
   */
  static count(csv: string, options?: CountOptions): number {
    const reader = new CsvReader({ headers: true });
    const rows = reader.parse(csv);
    return rows.length;
  }

  /**
   * Extract the column names from the first (header) row of a CSV string.
   *
   * @param csv - Raw CSV string.
   * @param options - Parse options.
   */
  static columns(csv: string, options?: Pick<ParseOptions, 'delimiter' | 'quoteChar'>): string[] {
    const reader = new CsvReader({ ...options, headers: true });
    const rows = reader.parse(csv);
    return rows.length > 0 ? Object.keys(rows[0]) : [];
  }

  /**
   * Merge multiple CSV strings into one.
   * Only the header from the first string is kept (unless `repeatHeaders` is true).
   *
   * @param csvStrings - Array of CSV strings to merge.
   * @param options - Merge and CSV options.
   */
  static merge(csvStrings: string[], options?: MergeOptions): string {
    if (csvStrings.length === 0) return '';
    const allRows: Record<string, unknown>[][] = csvStrings.map((s) => {
      const reader = new CsvReader({ headers: true });
      return reader.parse(s) as Record<string, unknown>[];
    });

    const headers = allRows[0].length > 0 ? Object.keys(allRows[0][0]) : [];
    const combined: Record<string, unknown>[] = allRows.flat();
    return CSV.fromArray(combined as Record<string, unknown>[], { ...options, headers });
  }

  /**
   * Filter rows in a CSV string using a predicate function.
   *
   * @param csv - Raw CSV string.
   * @param predicate - Return true to keep the row.
   * @param options - CSV options.
   */
  static filter(
    csv: string,
    predicate: (row: Record<string, string>, index: number) => boolean,
    options?: CsvOptions,
  ): string {
    const reader = new CsvReader({ headers: true });
    const rows = reader.parse(csv);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const filtered = rows.filter(predicate);
    const writer = new CsvWriter(options);
    return writer.serialize(filtered.map((r) => Object.values(r)), headers);
  }

  /**
   * Transform rows in a CSV string using a mapping function.
   *
   * @param csv - Raw CSV string.
   * @param transform - Mapping function applied to each row.
   * @param options - CSV options.
   */
  static transform(
    csv: string,
    transform: (row: Record<string, string>, index: number) => Record<string, unknown>,
    options?: CsvOptions,
  ): string {
    const reader = new CsvReader({ headers: true });
    const rows = reader.parse(csv);
    const mapped = rows.map(transform);
    const headers = mapped.length > 0 ? Object.keys(mapped[0]) : [];
    const writer = new CsvWriter(options);
    return writer.serialize(mapped.map((r) => Object.values(r)), headers);
  }

  /**
   * Compute basic statistics (min, max, sum, avg, count) for a numeric column.
   *
   * @param csv - Raw CSV string.
   * @param column - Column name to analyze.
   * @param options - Parse options.
   */
  static columnStats(
    csv: string,
    column: string,
    options?: ParseOptions,
  ): ColumnStats {
    const rows = CSV.parse(csv, options);
    const values = rows
      .map((r) => parseFloat(r[column] ?? ''))
      .filter((v) => !isNaN(v));
    if (values.length === 0) {
      return { min: 0, max: 0, sum: 0, avg: 0, count: 0 };
    }
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      sum,
      avg: sum / values.length,
      count: values.length,
    };
  }

  /**
   * Deduplicate rows in a CSV string based on one or more column keys.
   *
   * @param csv - Raw CSV string.
   * @param keys - Column names to use as the dedup key. When omitted, whole-row equality is used.
   * @param options - CSV options.
   */
  static deduplicate(csv: string, keys?: string[], options?: CsvOptions): string {
    const reader = new CsvReader({ headers: true });
    const rows = reader.parse(csv);
    const seen = new Set<string>();
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const unique = rows.filter((row) => {
      const key = keys
        ? keys.map((k) => row[k] ?? '').join('\x00')
        : JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const writer = new CsvWriter(options);
    return writer.serialize(unique.map((r) => Object.values(r)), headers);
  }

  /**
   * Sort rows in a CSV string by one or more columns.
   *
   * @param csv - Raw CSV string.
   * @param columns - Column names and sort direction.
   * @param options - CSV options.
   */
  static sort(
    csv: string,
    columns: Array<{ key: string; direction?: 'asc' | 'desc' }>,
    options?: CsvOptions,
  ): string {
    const reader = new CsvReader({ headers: true });
    const rows = reader.parse(csv);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const sorted = [...rows].sort((a, b) => {
      for (const { key, direction } of columns) {
        const av = a[key] ?? '';
        const bv = b[key] ?? '';
        const numA = parseFloat(av);
        const numB = parseFloat(bv);
        const cmp = !isNaN(numA) && !isNaN(numB)
          ? numA - numB
          : av.localeCompare(bv);
        if (cmp !== 0) return direction === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
    const writer = new CsvWriter(options);
    return writer.serialize(sorted.map((r) => Object.values(r)), headers);
  }

  /**
   * Select only specific columns from a CSV string.
   *
   * @param csv - Raw CSV string.
   * @param columns - Column names to keep.
   * @param options - CSV options.
   */
  static select(csv: string, columns: string[], options?: CsvOptions): string {
    const reader = new CsvReader({ headers: true });
    const rows = reader.parse(csv);
    const writer = new CsvWriter(options);
    const projected = rows.map((row) => {
      const result: Record<string, string> = {};
      for (const col of columns) {
        result[col] = row[col] ?? '';
      }
      return result;
    });
    return writer.serialize(projected.map((r) => Object.values(r)), columns);
  }

  /**
   * Build a CSV string from a plain array of objects — no class needed.
   *
   * @param data - Array of objects to serialize.
   * @param options - CSV options including optional explicit headers.
   */
  static fromArray(
    data: Record<string, unknown>[],
    options?: FromArrayOptions,
  ): string {
    if (data.length === 0) {
      if (options?.headers && options.headers.length > 0) {
        const writer = new CsvWriter(options);
        return writer.serializeRow(options.headers);
      }
      return '';
    }

    const headers =
      options?.headers ??
      (options?.includeHeaders !== false ? Object.keys(data[0]) : undefined);

    const writer = new CsvWriter(options);
    const rows = data.map((row) => Object.values(row));
    return writer.serialize(rows, headers);
  }

  /**
   * Parse a CSV string into an array of keyed records — no class needed.
   *
   * @param csv - Raw CSV string.
   * @param options - Parse options.
   */
  static parse(csv: string, options?: ParseOptions): Record<string, string>[] {
    const reader = new CsvReader(options);
    return reader.parse(csv);
  }

  /**
   * Async generator that yields CSV chunks.
   * Useful for streaming large datasets without loading everything into memory.
   *
   * @param exportable - An instance implementing `CsvExportable`.
   * @param options - Stream and CSV options.
   */
  static async *stream(
    exportable: CsvExportable,
    options?: StreamOptions,
  ): AsyncGenerator<string> {
    const collection = await Promise.resolve(exportable.collection());
    const headers = hasCsvHeadings(exportable) ? exportable.headings() : undefined;
    const rows = collection.map((row) =>
      hasCsvMapping(exportable) ? exportable.map(row) : Object.values(row),
    );
    const encoding = hasCsvEncoding(exportable)
      ? exportable.encoding()
      : options?.encoding ?? 'utf-8';
    const writer = new CsvWriter({ ...options, encoding });
    yield* writer.stream(rows, headers, options?.chunkSize ?? 1000);
  }
}
