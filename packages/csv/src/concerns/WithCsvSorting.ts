/**
 * Sort the collection before export.
 * Return a comparator function compatible with Array.prototype.sort.
 */
export interface WithCsvSorting {
  sortBy(): (a: Record<string, unknown>, b: Record<string, unknown>) => number;
}
