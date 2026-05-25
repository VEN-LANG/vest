/**
 * Options for importing from a buffer rather than a file path.
 */
export interface ImportSourceOptions {
  /** When 'buffer', the first argument is treated as a Buffer. */
  type?: 'buffer';
}

/**
 * Options for queued export jobs.
 */
export interface QueueOptions {
  /** Optional disk path to write the file to after generation. */
  outputDir?: string;
}

/**
 * Options for Excel.fromArray().
 */
export interface FromArrayOptions {
  /** Worksheet name. Default: 'Sheet1' */
  sheetName?: string;
  /** Explicit column headers. Falls back to object keys when omitted. */
  headers?: string[];
}
