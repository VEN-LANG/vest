import type ExcelJS from 'exceljs';

/**
 * Hook into individual row write events.
 */
export interface WithEvents {
  onRow?(row: ExcelJS.Row, data: Record<string, unknown>): void;
}
