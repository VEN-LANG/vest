/**
 * Apply worksheet protection.
 * Return a password string to protect the sheet, or protection options.
 */
export interface WithProtection {
  protection(): string | WorksheetProtectionOptions;
}

export interface WorksheetProtectionOptions {
  password?: string;
  selectLockedCells?: boolean;
  selectUnlockedCells?: boolean;
  formatCells?: boolean;
  formatColumns?: boolean;
  formatRows?: boolean;
  insertRows?: boolean;
  insertColumns?: boolean;
  deleteRows?: boolean;
  deleteColumns?: boolean;
  sort?: boolean;
  autoFilter?: boolean;
}
