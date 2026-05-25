/**
 * Freeze the top N rows of the worksheet (useful for keeping headings visible).
 * Return the number of rows to freeze (e.g. 1 to freeze the header row).
 */
export interface WithFrozenRows {
  frozenRows(): number;
}
