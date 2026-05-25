/**
 * Validate each row during CSV import.
 * Return true to accept the row, false to skip it, or a string (error message) to throw.
 */
export interface WithCsvValidation {
  validate(row: Record<string, string>, rowIndex: number): boolean | string | Promise<boolean | string>;
}
