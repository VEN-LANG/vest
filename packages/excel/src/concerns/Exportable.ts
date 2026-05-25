/**
 * Core interface for all export classes.
 * Implement `collection()` to return the rows to export.
 */
export interface Exportable {
  collection(): Promise<Record<string, unknown>[]> | Record<string, unknown>[];
}
