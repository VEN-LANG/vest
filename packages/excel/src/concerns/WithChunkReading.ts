/**
 * Read the spreadsheet in chunks of rows to reduce memory usage.
 */
export interface WithChunkReading {
  chunkSize(): number;
}
