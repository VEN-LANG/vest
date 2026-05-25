/**
 * Freeze the left N columns of the worksheet.
 * Return the number of columns to freeze.
 */
export interface WithFrozenColumns {
  frozenColumns(): number;
}
