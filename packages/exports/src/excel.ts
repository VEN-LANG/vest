import * as XLSX from 'xlsx';
import { readFile } from 'node:fs/promises';
import type { ExcelOptions, ExcelColumn } from './types.js';

const mapColumns = (data: Record<string, any>[], columns: ExcelColumn[]): Record<string, any>[] =>
  data.map(row => {
    const mapped: Record<string, any> = {};
    for (const col of columns) {
      mapped[col.header] = row[col.key];
    }
    return mapped;
  });

export const toExcel = (data: Record<string, any>[], options?: ExcelOptions): Buffer => {
  const { columns, sheetName = 'Sheet1' } = options || {};
  const mapped = columns ? mapColumns(data, columns) : data;
  const ws = XLSX.utils.json_to_sheet(mapped);

  if (columns) {
    ws['!cols'] = columns.map(col => ({ wch: col.width ?? 12 }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
};

export const toExcelFromTemplate = async (
  templatePath: string,
  data: Record<string, any>[],
  options?: ExcelOptions,
): Promise<Buffer> => {
  const template: { columns?: ExcelColumn[]; sheetName?: string } = JSON.parse(
    await readFile(templatePath, 'utf-8'),
  );
  return toExcel(data, { columns: template.columns, sheetName: template.sheetName, ...options });
};
