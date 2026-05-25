/**
 * Options controlling CSV serialization and parsing behaviour.
 */
export interface CsvOptions {
  /** Column delimiter. Default: ',' */
  delimiter?: string;
  /** Line ending sequence. Default: '\n' */
  lineEnding?: '\n' | '\r\n';
  /** Output encoding. 'utf-8-bom' prepends a BOM for Excel compatibility. Default: 'utf-8' */
  encoding?: 'utf-8' | 'utf-8-bom';
  /** Quote character wrapping fields that contain special characters. Default: '"' */
  quoteChar?: string;
  /** Escape character for the quote character inside a quoted field. Default: '"' (doubled). */
  escapeChar?: string;
  /** Whether to include the header row on output. Default: true */
  includeHeaders?: boolean;
  /** String representation for null/undefined values. Default: '' */
  nullValue?: string;
  /** String representation for boolean true. Default: '1' */
  booleanTrue?: string;
  /** String representation for boolean false. Default: '0' */
  booleanFalse?: string;
}

/**
 * Options for CSV.fromArray static helper.
 */
export interface FromArrayOptions extends CsvOptions {
  /** Explicit list of column headers. When omitted, keys of first row are used. */
  headers?: string[];
}

/**
 * Options for CSV.parse static helper.
 */
export interface ParseOptions {
  /** Column delimiter. Default: ',' */
  delimiter?: string;
  /** Whether the first line is a header row. Default: true */
  headers?: boolean;
  /** Quote character. Default: '"' */
  quoteChar?: string;
}

/**
 * Options for CSV.import when reading from a string rather than a file.
 */
export interface ImportSourceOptions {
  /** When 'string', the first argument is treated as a CSV string. */
  type?: 'string';
}

/**
 * Options for CSV.stream.
 */
export interface StreamOptions extends CsvOptions {
  /** Number of rows per emitted chunk. Default: 1000 */
  chunkSize?: number;
}

/**
 * Result of a row-level validation call.
 */
export interface CsvValidationResult {
  row: Record<string, string>;
  rowIndex: number;
  valid: boolean;
  error?: string;
}

/**
 * Options for CSV.merge.
 */
export interface MergeOptions extends CsvOptions {
  /** Whether to include the header row from subsequent files. Default: false */
  repeatHeaders?: boolean;
}

/**
 * Options for CSV.count.
 */
export interface CountOptions {
  /** When true, count excludes the header row. Default: true */
  excludeHeader?: boolean;
}

/**
 * Summary statistics for a numeric CSV column.
 */
export interface ColumnStats {
  min: number;
  max: number;
  sum: number;
  avg: number;
  count: number;
}
