/**
 * Transform each row before it is written to the spreadsheet.
 */
export interface WithMapping {
  map(row: Record<string, unknown>): unknown[];
}
