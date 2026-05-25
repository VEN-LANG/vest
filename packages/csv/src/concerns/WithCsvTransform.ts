/**
 * Transform each row before it is written during CSV export.
 */
export interface WithCsvTransform {
  transform(row: Record<string, unknown>, index: number): Record<string, unknown> | Promise<Record<string, unknown>>;
}
