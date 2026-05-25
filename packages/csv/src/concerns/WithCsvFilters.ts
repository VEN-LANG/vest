/**
 * Filter rows during CSV import or export.
 * Return true to include the row, false to skip it.
 */
export interface WithCsvFilters {
  filter(row: Record<string, unknown>, index: number): boolean | Promise<boolean>;
}
