import { Mailable } from '@lara-node/mail';

interface InvoiceItem { description: string; quantity: number; unitPrice: number; }

/*
|--------------------------------------------------------------------------
| InvoiceEmail  — example of a structured transactional email
|--------------------------------------------------------------------------
*/
export class InvoiceEmail extends Mailable {
  constructor(
    private readonly userEmail: string,
    private readonly invoice: {
      number: string;
      date: Date;
      items: InvoiceItem[];
      currency?: string;
    },
  ) { super(); }

  private get total(): number {
    return this.invoice.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  }

  private fmt(amount: number): string {
    return (this.invoice.currency || 'USD') + ' ' + amount.toFixed(2);
  }

  build() {
    const rows = this.invoice.items
      .map((i) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${i.description}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${i.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${this.fmt(i.unitPrice)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${this.fmt(i.quantity * i.unitPrice)}</td>
      </tr>`)
      .join('');

    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', process.env.MAIL_FROM_NAME || 'apps/example')
      .subject(`Invoice #${this.invoice.number}`)
      .html(`
        <h2>Invoice #${this.invoice.number}</h2>
        <p>Date: ${this.invoice.date.toLocaleDateString()}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left">Description</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Unit Price</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:8px;text-align:right;font-weight:bold">Total</td>
              <td style="padding:8px;text-align:right;font-weight:bold">${this.fmt(this.total)}</td>
            </tr>
          </tfoot>
        </table>
      `)
      .text(`Invoice #${this.invoice.number}\nTotal: ${this.fmt(this.total)}`);
  }
}
