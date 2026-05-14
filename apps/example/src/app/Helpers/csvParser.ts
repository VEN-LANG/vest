export type CSVInput =
  | string
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | ReadableStream<Uint8Array>
  | NodeJS.ReadableStream;

export interface ParseOptions {
  /** Extract column names from first row */
  columns?: boolean | string[];

  /** Skip empty lines */
  skip_empty_lines?: boolean;

  /** Trim whitespace from fields */
  trim?: boolean;

  /** Trim only leading/trailing whitespace */
  trim_whitespace?: "both" | "leading" | "trailing" | "none";

  /** Quote character */
  quote?: string;

  /** Escape character for quotes inside quoted fields */
  escape?: string;

  /** Comment character (lines starting with this will be ignored) */
  comment?: string;

  /** Field delimiter */
  delimiter?: string;

  /** Delimiters to try during auto-detection */
  detect_delimiters?: string[];

  /** Maximum number of rows to parse */
  max_rows?: number;

  /** Skip initial lines */
  skip_lines?: number;

  /** Number of lines to preview for delimiter detection */
  preview_lines?: number;

  /** Handle different line endings */
  line_terminator?: "\n" | "\r\n" | "auto";

  /** Transform function for each field */
  transform?: (value: string, column: string, rowIndex: number) => any;

  /** Transform function for each row */
  transformRow?: (row: any, index: number) => any;

  /** Validate each row */
  validate?: (row: any, index: number) => boolean;

  /** Cast field values to appropriate types */
  cast?: boolean | ((value: string, column: string) => any);

  /** Fallback value for missing columns */
  default?: any;

  /** Include row index in output */
  include_row_index?: boolean | string;

  /** Parse numbers */
  parse_numbers?: boolean;

  /** Parse booleans */
  parse_booleans?: boolean;

  /** Parse dates */
  parse_dates?: boolean;

  /** Specify date format for parsing */
  date_format?: string;

  /** Return raw rows instead of objects when columns=true */
  raw?: boolean;
}

interface ParseResult<T = any> {
  data: T[];
  errors: ParseError[];
  meta: {
    delimiter: string;
    line_terminator: string;
    columns: string[];
    rows: number;
    truncated: boolean;
  };
}

interface ParseError {
  type: "missing_column" | "validation" | "cast" | "format";
  message: string;
  row: number;
  column?: string;
  value?: string;
}

function normalizeInput(input: CSVInput): Promise<string> | string {
  if (typeof input === "string") return input;

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
    return input.toString("utf8");
  }

  if (input instanceof Uint8Array) {
    return new TextDecoder("utf-8").decode(input);
  }

  if (input instanceof ArrayBuffer) {
    return new TextDecoder("utf-8").decode(new Uint8Array(input));
  }

  // Handle streams
  if (typeof ReadableStream !== "undefined" && input instanceof ReadableStream) {
    return readStream(input);
  }

  // Handle Node.js streams
  if (typeof process !== "undefined" && input && typeof (input as any).pipe === "function") {
    return readNodeStream(input as NodeJS.ReadableStream);
  }

  throw new Error("Unsupported CSV input type");
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder("utf-8");
  const reader = stream.getReader();
  let result = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}

async function readNodeStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => (data += chunk));
    stream.on("end", () => resolve(data));
    stream.on("error", reject);
  });
}

function detectDelimiter(
  text: string,
  options: {
    candidates?: string[];
    previewLines?: number;
  } = {},
): string {
  const { candidates = [",", ";", "\t", "|", ":", " "], previewLines = 10 } = options;

  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, previewLines);

  if (lines.length === 0) return ",";

  const scores = new Map<string, number>();
  const consistencyScores = new Map<string, number>();

  for (const d of candidates) {
    let totalCount = 0;
    const counts: number[] = [];
    let consistent = true;

    for (const line of lines) {
      // Skip lines that start with comment characters
      if (line.trim().startsWith("#")) continue;

      // Simple detection - count occurrences
      let count = 0;
      let inQuotes = false;
      let quoteChar = '"';

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === quoteChar) {
          inQuotes = !inQuotes;
        } else if (!inQuotes && ch === d) {
          count++;
        }
      }

      counts.push(count);
      totalCount += count;
    }

    if (counts.length === 0) continue;

    // Calculate consistency (all lines should have same or similar count)
    const avg = totalCount / counts.length;
    let variance = 0;
    for (const count of counts) {
      variance += Math.pow(count - avg, 2);
    }
    variance /= counts.length;

    const consistency = 1 / (1 + variance);
    consistencyScores.set(d, consistency);
    scores.set(d, avg * consistency);
  }

  if (scores.size === 0) return ",";

  let bestDelimiter = ",";
  let bestScore = -1;

  for (const [delimiter, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function autoTypeCast(
  value: string,
  options: {
    parse_numbers?: boolean;
    parse_booleans?: boolean;
    parse_dates?: boolean;
    date_format?: string;
  } = {},
): any {
  if (value === "") return null;

  const trimmed = value.trim();
  if (trimmed === "") return value;

  // Parse numbers
  if (options.parse_numbers !== false) {
    // Check for integers
    if (/^-?\d+$/.test(trimmed)) {
      const intVal = parseInt(trimmed, 10);
      if (!isNaN(intVal)) return intVal;
    }

    // Check for floats
    if (/^-?\d*\.?\d+(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      const floatVal = parseFloat(trimmed);
      if (!isNaN(floatVal)) return floatVal;
    }
  }

  // Parse booleans
  if (options.parse_booleans !== false) {
    const lower = trimmed.toLowerCase();
    if (lower === "true" || lower === "yes" || lower === "1") return true;
    if (lower === "false" || lower === "no" || lower === "0") return false;
  }

  // Parse dates
  if (options.parse_dates !== false) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try specific format if provided
    if (options.date_format) {
      // Simple date format parsing (could be enhanced with date-fns or similar)
      // This is a basic implementation
      const date = parseDateWithFormat(trimmed, options.date_format);
      if (date) return date;
    }
  }

  return value;
}

function parseDateWithFormat(dateStr: string, format: string): Date | null {
  // Simple implementation - can be enhanced with a proper date library
  try {
    // Handle common formats
    if (format === "ISO") {
      return new Date(dateStr);
    }

    // Add more format parsing as needed
    return new Date(dateStr);
  } catch {
    return null;
  }
}

function trimValue(value: string, mode: "both" | "leading" | "trailing" | "none" = "both"): string {
  switch (mode) {
    case "both":
      return value.trim();
    case "leading":
      return value.replace(/^\s+/, "");
    case "trailing":
      return value.replace(/\s+$/, "");
    case "none":
      return value;
    default:
      return value.trim();
  }
}

export async function parseCSV(input: CSVInput, options: ParseOptions = {}): Promise<ParseResult> {
  const normalized = await normalizeInput(input);
  return parseCSVSync(normalized, options);
}

export function parseCSVSync(input: string, options: ParseOptions = {}): ParseResult {
  const {
    columns = true,
    skip_empty_lines = true,
    trim = true,
    trim_whitespace = "both",
    delimiter,
    detect_delimiters = [",", ";", "\t", "|", ":"],
    quote = '"',
    escape = '"',
    comment,
    max_rows = Infinity,
    skip_lines = 0,
    preview_lines = 10,
    line_terminator = "auto",
    transform,
    transformRow,
    validate,
    cast = false,
    default: defaultValue,
    include_row_index = false,
    parse_numbers = true,
    parse_booleans = true,
    parse_dates = false,
    date_format,
    raw = false,
  } = options;

  const errors: ParseError[] = [];
  const data: any[] = [];

  // Auto-detect delimiter if not provided
  const sep =
    delimiter ||
    detectDelimiter(input, {
      candidates: detect_delimiters,
      previewLines: preview_lines,
    });

  // Auto-detect line terminator
  let lineTerminator = "\n";
  if (line_terminator === "auto") {
    const crlfIndex = input.indexOf("\r\n");
    const lfIndex = input.indexOf("\n");
    if (crlfIndex !== -1 && (lfIndex === -1 || crlfIndex < lfIndex)) {
      lineTerminator = "\r\n";
    }
  } else {
    lineTerminator = line_terminator;
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let escaped = false;
  let rowIndex = 0;
  let globalRowIndex = 0;
  let skipCounter = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    // Handle skipping initial lines
    if (skipCounter < skip_lines) {
      if (ch === "\n" || (ch === "\r" && next === "\n")) {
        if (ch === "\r" && next === "\n") i++;
        skipCounter++;
        continue;
      }
      continue;
    }

    // Handle comments
    if (comment && !inQuotes && ch === comment && row.length === 0 && field === "") {
      // Skip to end of line
      while (
        i < input.length &&
        input[i] !== "\n" &&
        !(input[i] === "\r" && input[i + 1] === "\n")
      ) {
        i++;
      }
      continue;
    }

    // Handle escape sequences
    if (ch === escape && !escaped) {
      if (inQuotes && next === quote) {
        escaped = true;
        continue;
      }
    }

    if (escaped) {
      field += ch;
      escaped = false;
      continue;
    }

    // Handle quotes
    if (ch === quote) {
      inQuotes = !inQuotes;
      continue;
    }

    // Handle field delimiter
    if (!inQuotes && ch === sep) {
      const trimmed = trim ? trimValue(field, trim_whitespace) : field;
      row.push(trimmed);
      field = "";
      continue;
    }

    // Handle line terminators
    if (!inQuotes && (ch === "\n" || (ch === "\r" && next === "\n"))) {
      const trimmed = trim ? trimValue(field, trim_whitespace) : field;
      row.push(trimmed);

      // Check if line should be skipped
      const shouldSkip = skip_empty_lines && row.every((cell) => cell === "");

      if (!shouldSkip) {
        rows.push([...row]);
        globalRowIndex++;

        // Check max rows
        if (globalRowIndex >= max_rows) {
          break;
        }
      }

      row = [];
      field = "";

      if (ch === "\r" && next === "\n") i++;
      continue;
    }

    field += ch;
  }

  // Handle last field/row
  if (field !== "" || row.length > 0) {
    const trimmed = trim ? trimValue(field, trim_whitespace) : field;
    row.push(trimmed);
    rows.push([...row]);
  }

  // Process rows into data
  let header: string[] = [];
  let startIndex = 0;

  if (columns) {
    if (Array.isArray(columns)) {
      header = columns;
    } else if (rows.length > 0) {
      header = rows[0];
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < rows.length; i++) {
    const rawRow = rows[i];
    let rowObj: any = {};

    if (raw) {
      rowObj = [...rawRow];
    } else if (header.length > 0) {
      // Create object from header
      for (let j = 0; j < header.length; j++) {
        const key = header[j] || `column_${j + 1}`;
        const value = j < rawRow.length ? rawRow[j] : defaultValue;

        // Type casting
        let finalValue = value;
        if (cast) {
          if (typeof cast === "function") {
            finalValue = cast(value, key);
          } else {
            finalValue = autoTypeCast(value, {
              parse_numbers,
              parse_booleans,
              parse_dates,
              date_format,
            });
          }
        }

        // Apply transform if provided
        if (transform) {
          finalValue = transform(finalValue, key, i);
        }

        rowObj[key] = finalValue;
      }

      // Fill missing columns with default value
      for (let j = rawRow.length; j < header.length; j++) {
        const key = header[j] || `column_${j + 1}`;
        if (!(key in rowObj)) {
          rowObj[key] = defaultValue;
        }
      }
    } else {
      // Return as array
      rowObj = rawRow.map((value, j) => {
        if (cast && typeof cast === "function") {
          return cast(value, `column_${j + 1}`);
        }
        return value;
      });
    }

    // Include row index if requested
    if (include_row_index) {
      const indexKey = typeof include_row_index === "string" ? include_row_index : "_index";
      rowObj[indexKey] = i - startIndex;
    }

    // Apply row transform if provided
    if (transformRow) {
      try {
        rowObj = transformRow(rowObj, i - startIndex);
      } catch (error) {
        errors.push({
          type: "format",
          message: `Transform error: ${error instanceof Error ? error.message : String(error)}`,
          row: i - startIndex,
        });
        continue;
      }
    }

    // Validate row if provided
    if (validate) {
      try {
        if (!validate(rowObj, i - startIndex)) {
          errors.push({
            type: "validation",
            message: "Row failed validation",
            row: i - startIndex,
          });
          continue;
        }
      } catch (error) {
        errors.push({
          type: "validation",
          message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
          row: i - startIndex,
        });
        continue;
      }
    }

    data.push(rowObj);
    rowIndex++;
  }

  return {
    data,
    errors,
    meta: {
      delimiter: sep,
      line_terminator,
      columns: header,
      rows: data.length,
      truncated: globalRowIndex >= max_rows,
    },
  };
}

// Utility functions for common operations
export function parseCSVToObjects(input: CSVInput, options?: ParseOptions): Promise<any[]> {
  return parseCSV(input, { ...options, columns: true }).then((result) => result.data);
}

export function parseCSVToArrays(input: CSVInput, options?: ParseOptions): Promise<any[][]> {
  return parseCSV(input, { ...options, columns: false }).then((result) => result.data);
}

export function streamParseCSV(
  input: ReadableStream<Uint8Array> | NodeJS.ReadableStream,
  options: ParseOptions = {},
  onRow?: (row: any, index: number) => void,
): Promise<ParseResult> {
  return new Promise(async (resolve, reject) => {
    const text = await normalizeInput(input);
    const result = parseCSVSync(text, options);

    if (onRow) {
      result.data.forEach((row, index) => onRow(row, index));
    }

    resolve(result);
  });
}

// Export types for better TypeScript support
export type { ParseResult, ParseError };

export default {
  parseCSV,
  parseCSVSync,
  parseCSVToObjects,
  parseCSVToArrays,
  streamParseCSV,
};
