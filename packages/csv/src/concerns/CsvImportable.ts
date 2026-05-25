/**
 * Core interface for all CSV import classes.
 */
export interface CsvImportable {
  model(row: Record<string, string>): Promise<void> | void;
}
