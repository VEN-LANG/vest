/**
 * Process rows in batches instead of one at a time.
 */
export interface WithBatchInserts {
  batchSize(): number;
  batchInsert(rows: Record<string, unknown>[]): Promise<void>;
}
