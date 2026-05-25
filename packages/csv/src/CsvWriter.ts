import type { CsvOptions } from './types.js';

const UTF8_BOM = '﻿';

/**
 * Low-level CSV serializer.
 * Handles escaping, quoting, line endings, and BOM.
 */
export class CsvWriter {
  private delimiter: string;
  private lineEnding: string;
  private quoteChar: string;
  private escapeChar: string;
  private nullValue: string;
  private booleanTrue: string;
  private booleanFalse: string;
  private encoding: string;

  constructor(options: CsvOptions = {}) {
    this.delimiter = options.delimiter ?? ',';
    this.lineEnding = options.lineEnding ?? '\n';
    this.quoteChar = options.quoteChar ?? '"';
    this.escapeChar = options.escapeChar ?? '"';
    this.nullValue = options.nullValue ?? '';
    this.booleanTrue = options.booleanTrue ?? '1';
    this.booleanFalse = options.booleanFalse ?? '0';
    this.encoding = options.encoding ?? 'utf-8';
  }

  /**
   * Serialize a single value to a safe CSV field string.
   */
  escapeField(value: unknown): string {
    if (value === null || value === undefined) {
      return this.nullValue;
    }
    if (typeof value === 'boolean') {
      return value ? this.booleanTrue : this.booleanFalse;
    }

    const str = String(value);
    const needsQuoting =
      str.includes(this.delimiter) ||
      str.includes(this.quoteChar) ||
      str.includes('\n') ||
      str.includes('\r');

    if (!needsQuoting) {
      return str;
    }

    // Escape quote chars by doubling them (or using escapeChar)
    const escaped = str.split(this.quoteChar).join(this.escapeChar + this.quoteChar);
    return `${this.quoteChar}${escaped}${this.quoteChar}`;
  }

  /**
   * Serialize a row (array of values) to a CSV line string (no trailing newline).
   */
  serializeRow(row: unknown[]): string {
    return row.map((v) => this.escapeField(v)).join(this.delimiter);
  }

  /**
   * Serialize a collection of rows (plus optional headers) to a complete CSV string.
   */
  serialize(rows: unknown[][], headers?: string[]): string {
    const lines: string[] = [];

    if (headers && headers.length > 0) {
      lines.push(this.serializeRow(headers));
    }

    for (const row of rows) {
      lines.push(this.serializeRow(row));
    }

    const body = lines.join(this.lineEnding);
    return this.encoding === 'utf-8-bom' ? UTF8_BOM + body : body;
  }

  /**
   * Async generator that yields CSV chunks of `chunkSize` rows.
   * Each yielded chunk is a self-contained CSV string (with headers on the first chunk).
   */
  async *stream(
    rows: unknown[][],
    headers?: string[],
    chunkSize = 1000,
  ): AsyncGenerator<string> {
    let bomPending = this.encoding === 'utf-8-bom';

    const withBom = (s: string): string => {
      if (bomPending) { bomPending = false; return UTF8_BOM + s; }
      return s;
    };

    // Headers are their own first chunk
    if (headers && headers.length > 0) {
      yield withBom(this.serializeRow(headers));
    }

    let i = 0;
    while (i < rows.length) {
      const batch = rows.slice(i, i + chunkSize);
      const lines = batch.map((row) => this.serializeRow(row));
      yield withBom(lines.join(this.lineEnding));
      i += chunkSize;
    }
  }
}
