/**
 * Add conditional formatting rules to the worksheet.
 * Each rule targets a cell range and applies an ExcelJS conditional format.
 */
export interface WithConditionalFormatting {
  conditionalFormats(): ConditionalFormattingRule[];
}

export interface ConditionalFormattingRule {
  /** Cell range to apply the rule to, e.g. 'B2:B100'. */
  ref: string;
  /** ExcelJS conditional formatting rules array to apply. */
  rules: unknown[];
}
