/**
 * Provide explicit column headings for the CSV output.
 */
export interface WithCsvHeadings {
  headings(): string[];
}
