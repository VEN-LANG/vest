/**
 * Apply number/date format strings to specific columns.
 *
 * Keys are column headers or 1-based column indices as strings.
 * Values are Excel number format strings, e.g. '#,##0.00'.
 */
export interface WithColumnFormatting {
  columnFormats(): Record<string, string>;
}
