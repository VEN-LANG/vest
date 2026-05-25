/**
 * Set a custom colour for the worksheet tab.
 * Return an ARGB hex string (e.g. 'FF4472C4') or a named colour.
 */
export interface WithTabColor {
  tabColor(): string;
}
