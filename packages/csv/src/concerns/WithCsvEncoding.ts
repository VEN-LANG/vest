/**
 * Override the output encoding for this export class.
 */
export interface WithCsvEncoding {
  encoding(): 'utf-8' | 'utf-8-bom';
}
