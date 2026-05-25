import type { Exportable } from './Exportable.js';

/**
 * Export to multiple sheets within a single workbook.
 */
export interface WithMultipleSheets {
  sheets(): Exportable[];
  /** Optional: return the name for this sheet. */
  sheetName?(): string;
}
