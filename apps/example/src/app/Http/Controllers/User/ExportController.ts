import { Request, Response } from 'express';
import { Injectable } from '@lara-node/core';
import { Doc } from '@lara-node/router';
import { CSV } from '@lara-node/csv';
import { Excel } from '@lara-node/excel';
import { Pdf } from '@lara-node/pdf';
import { Xml } from '@lara-node/xml';
import User from '@app/Models/User/User';
import { WithExportable } from '@app/Traits/WithExportable';

/*
|--------------------------------------------------------------------------
| ExportController
|--------------------------------------------------------------------------
|
| Exports users in CSV, Excel, PDF and XML formats.
| Delegates data retrieval to User.toExportable() (WithExportable trait).
|
*/
@Injectable()
export class ExportController {
  // ── CSV ──────────────────────────────────────────────────────────────────────

  @Doc({ summary: 'Export users as CSV', tags: ['Exports'], auth: true })
  async csv(_req: Request, res: Response): Promise<void> {
    const exp = (User as unknown as typeof WithExportable).toExportable();
    await CSV.download(exp, 'users.csv', res);
  }

  // ── Excel ─────────────────────────────────────────────────────────────────────

  @Doc({ summary: 'Export users as Excel (.xlsx)', tags: ['Exports'], auth: true })
  async excel(_req: Request, res: Response): Promise<void> {
    const exp = (User as unknown as typeof WithExportable).toExportable();
    await Excel.download(exp, 'users.xlsx', res);
  }

  // ── PDF ───────────────────────────────────────────────────────────────────────

  @Doc({ summary: 'Export users as PDF', tags: ['Exports'], auth: true })
  async pdf(_req: Request, res: Response): Promise<void> {
    const exp = (User as unknown as typeof WithExportable).toExportable();
    const rows = await exp.collection();
    const headings = exp.headings();

    const headerCells = headings.map((h) => `<th>${h}</th>`).join('');
    const bodyRows = rows.map((row) =>
      `<tr>${exp.map(row).map((v) => `<td>${String(v ?? '')}</td>`).join('')}</tr>`,
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Users Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #4f46e5; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #4f46e5; color: #fff; padding: 10px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Users Report</h1>
  <p>Generated: ${new Date().toISOString().slice(0, 10)}</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p class="footer">Total: ${rows.length} user(s)</p>
</body>
</html>`;

    await Pdf.loadHTML(html).download(res, 'users.pdf');
  }

  // ── XML ───────────────────────────────────────────────────────────────────────

  @Doc({ summary: 'Export users as XML', tags: ['Exports'], auth: true })
  async xml(_req: Request, res: Response): Promise<void> {
    const exp = (User as unknown as typeof WithExportable).toExportable();
    const rows = await exp.collection();
    const headings = exp.headings();

    const builder = Xml.create('users')
      .att('count', String(rows.length))
      .att('generated', new Date().toISOString());

    for (const row of rows) {
      const values = exp.map(row);
      builder.ele('user');
      headings.forEach((heading, i) => {
        const key = heading.toLowerCase().replace(/\s+/g, '_');
        builder.ele(key).txt(String(values[i] ?? '')).up();
      });
      builder.up();
    }

    Xml.download(res, builder.end({ prettyPrint: true }), 'users.xml');
  }
}
