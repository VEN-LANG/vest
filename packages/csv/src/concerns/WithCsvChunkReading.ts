/**
 * Read large CSV files in chunks to reduce memory usage.
 */
export interface WithCsvChunkReading {
  chunkSize(): number;
}
