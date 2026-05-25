export interface PDFOptions {
  format?: string;
  landscape?: boolean;
  margin?: Record<string, string | number>;
  scale?: number;
  printBackground?: boolean;
  /*
   * Delimiters to replace with key escaped
   * example: ["{{" , "}}"] OR ["<%", "%>"]
   */
  delimiters?: [string, string];
}

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelOptions {
  sheetName?: string;
  columns?: ExcelColumn[];
}

export interface CSVOptions {
  delimiter?: string;
  columns?: ExcelColumn[];
}
