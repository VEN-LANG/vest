/**
 * Enable auto-filter on the header row.
 * Return true to apply auto-filter across all heading columns,
 * or return a column range string (e.g. 'A1:E1') for a custom range.
 */
export interface WithAutoFilter {
  autoFilter(): boolean | string;
}
