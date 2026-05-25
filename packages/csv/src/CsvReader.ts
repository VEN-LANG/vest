import type { ParseOptions } from './types.js';

const UTF8_BOM = '﻿';

/**
 * Low-level CSV parser.
 * Handles quoted fields (including embedded newlines), BOM stripping,
 * and configurable delimiters.
 */
export class CsvReader {
  private delimiter: string;
  private quoteChar: string;
  private withHeaders: boolean;

  constructor(options: ParseOptions = {}) {
    this.delimiter = options.delimiter ?? ',';
    this.quoteChar = options.quoteChar ?? '"';
    this.withHeaders = options.headers !== false;
  }

  /**
   * Parse a CSV string into an array of records.
   * When `headers` is true (default), the first row is used as keys.
   * When false, row indices ('0', '1', ...) are used as keys.
   */
  parse(csv: string): Record<string, string>[] {
    // Strip BOM
    const input = csv.startsWith(UTF8_BOM) ? csv.slice(1) : csv;

    const allRows = this.tokenize(input);
    if (allRows.length === 0) return [];

    if (!this.withHeaders) {
      return allRows.map((row) => {
        const record: Record<string, string> = {};
        row.forEach((v, i) => { record[String(i)] = v; });
        return record;
      });
    }

    const [headerRow, ...dataRows] = allRows;
    const headers = headerRow;

    return dataRows.map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = row[i] ?? '';
      });
      return record;
    });
  }

  /**
   * Tokenize a CSV string into a 2D array of string values.
   * Handles RFC 4180 quoting including embedded newlines.
   */
  private tokenize(input: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < input.length) {
      const ch = input[i];

      if (inQuotes) {
        if (ch === this.quoteChar) {
          // Check for escaped quote (doubled)
          if (input[i + 1] === this.quoteChar) {
            field += this.quoteChar;
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }

      // Not in quotes
      if (ch === this.quoteChar) {
        inQuotes = true;
        i++;
        continue;
      }

      if (ch === this.delimiter) {
        currentRow.push(field);
        field = '';
        i++;
        continue;
      }

      if (ch === '\r' && input[i + 1] === '\n') {
        currentRow.push(field);
        field = '';
        rows.push(currentRow);
        currentRow = [];
        i += 2;
        continue;
      }

      if (ch === '\n') {
        currentRow.push(field);
        field = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      }

      field += ch;
      i++;
    }

    // Push last field / row
    currentRow.push(field);
    if (currentRow.some((f) => f !== '')) {
      rows.push(currentRow);
    }

    return rows;
  }
}
