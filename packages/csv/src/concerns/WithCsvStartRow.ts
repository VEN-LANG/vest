/**
 * Skip N rows at the top of the CSV file during import (default: 1 header row).
 */
export interface WithCsvStartRow {
  startRow(): number;
}
