import type ExcelJS from 'exceljs';

/**
 * Hook called with the full workbook before row processing begins.
 */
export interface BeforeImport {
  beforeImport(workbook: ExcelJS.Workbook): void;
}
