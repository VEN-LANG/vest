import { readFileSync } from 'node:fs';
import type { CSVOptions, ExcelColumn } from './types.js';

const escapeCSV = (value: unknown): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const toCSV = (data: Record<string, any>[], options?: CSVOptions): string => {
  const { columns, delimiter = ',' } = options || {};
  const headers = columns ? columns.map(c => c.header) : Object.keys(data[0] || {});
  const lines: string[] = [headers.join(delimiter)];

  for (const row of data) {
    const values = columns
      ? columns.map(col => escapeCSV(row[col.key]))
      : headers.map(h => escapeCSV(row[h]));
    lines.push(values.join(delimiter));
  }

  return lines.join('\n');
};

export const toCSVFromTemplate = (
  templatePath: string,
  data: Record<string, any>[],
  options?: CSVOptions,
): string => {
  const template: { columns?: ExcelColumn[] } = JSON.parse(
    readFileSync(templatePath, 'utf-8'),
  );
  return toCSV(data, { columns: template.columns, ...options });
};
