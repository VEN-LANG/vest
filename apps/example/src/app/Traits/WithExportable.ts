import { trait } from '@lara-node/db';
import type { Model } from '@lara-node/db';

/**
 * WithExportable trait
 *
 * Adds CSV / Excel / PDF / XML export support to any Model.
 * Apply with @use(WithExportable) and configure exportFields / exportHeadings:
 *
 * @example
 * @use(WithExportable, SoftDeletes, Timestamps)
 * export class User extends Model {
 *   static exportFields  = ['id', 'name', 'email', 'status', 'created_at'];
 *   static exportHeadings = ['ID', 'Name', 'Email', 'Status', 'Created At'];
 * }
 *
 * // In a controller:
 * const exp = User.toExportable();              // implements CsvExportable + Exportable
 * await CSV.download(exp, 'users.csv', res);
 * await Excel.download(exp, 'users.xlsx', res);
 *
 * // With a scope:
 * const exp = User.toExportable((q) => q.where('status', 'active').orderBy('name'));
 */
@trait('WithExportable')
export class WithExportable {
  static exportFields: string[] = [];
  static exportHeadings: string[] = [];

  static toExportable(
    scope?: (q: ReturnType<typeof Model.query>) => ReturnType<typeof Model.query>,
  ) {
    const ModelClass = this as unknown as typeof Model & {
      exportFields: string[];
      exportHeadings: string[];
      fillable?: string[];
      hidden?: string[];
    };

    return {
      async collection(): Promise<Record<string, unknown>[]> {
        const fields = resolveFields(ModelClass);
        let q = ModelClass.query();
        if (scope) q = scope(q);
        const records = (await q.get()) as Model[];
        return records.map((record) => {
          const row: Record<string, unknown> = {};
          for (const f of fields)
            row[f] = record.getAttribute ? record.getAttribute(f) : (record as Record<string, unknown>)[f];
          return row;
        });
      },

      headings(): string[] {
        if (ModelClass.exportHeadings?.length) return ModelClass.exportHeadings;
        return resolveFields(ModelClass).map((f) =>
          f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        );
      },

      map(row: Record<string, unknown>): unknown[] {
        return Object.values(row);
      },
    };
  }
}

function resolveFields(ModelClass: { exportFields?: string[]; fillable?: string[]; hidden?: string[] }): string[] {
  if (ModelClass.exportFields?.length) return ModelClass.exportFields;
  return (ModelClass.fillable ?? []).filter((f) => !(ModelClass.hidden ?? []).includes(f));
}
