/**
 * Transform each row before it is serialized to CSV.
 */
export interface WithCsvMapping {
  map(row: Record<string, unknown>): unknown[];
}
