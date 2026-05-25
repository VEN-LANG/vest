/**
 * Core interface for all import classes.
 * Implement `model()` to handle each data row.
 */
export interface Importable {
  model(row: Record<string, unknown>): Promise<void> | void;
}
