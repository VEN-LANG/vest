import type ExcelJS from 'exceljs';

/**
 * Apply custom styles to the worksheet after rows have been written.
 */
export interface WithStyles {
  styles(worksheet: ExcelJS.Worksheet): ExcelJS.Worksheet;
}
