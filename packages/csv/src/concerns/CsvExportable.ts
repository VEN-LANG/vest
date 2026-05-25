/**
 * Core interface for all CSV export classes.
 */
export interface CsvExportable {
  collection(): Promise<Record<string, unknown>[]> | Record<string, unknown>[];
}
