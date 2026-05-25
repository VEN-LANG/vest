/**
 * Skip N header rows at the top of the sheet during import.
 * Defaults to 1 (the heading row) when not implemented.
 */
export interface WithStartRow {
  startRow(): number;
}
