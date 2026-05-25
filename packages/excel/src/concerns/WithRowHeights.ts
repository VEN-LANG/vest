/**
 * Set custom heights for specific rows.
 * Keys are 1-based row numbers; values are heights in points.
 */
export interface WithRowHeights {
  rowHeights(): Record<number, number>;
}
