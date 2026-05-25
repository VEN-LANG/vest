import type ExcelJS from 'exceljs';

/**
 * Hook called with the full workbook after all rows have been processed.
 */
export interface AfterImport {
  afterImport(workbook: ExcelJS.Workbook): void;
}
