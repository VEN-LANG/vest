import type ExcelJS from 'exceljs';

/**
 * Set workbook-level document properties (author, title, subject, etc.).
 */
export interface WithProperties {
  properties(): Partial<ExcelJS.WorkbookProperties>;
}
