/**
 * Set custom widths for specific columns.
 * Keys are 1-based column indices or header names; values are width in character units.
 */
export interface WithColumnWidths {
  columnWidths(): Record<string, number>;
}
