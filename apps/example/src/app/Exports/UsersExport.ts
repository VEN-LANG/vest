import User from '../Models/User/User';

/**
 * UsersExport
 *
 * Implements the exportable interface used by @lara-node/csv and @lara-node/excel.
 * The User model's @use(WithExportable) trait exposes the same interface via
 * User.toExportable() — this explicit class gives fine-grained control.
 *
 * Usage:
 *   await CSV.download(new UsersExport(), res, 'users.csv');
 *   await Excel.download(new UsersExport(), res, 'users.xlsx');
 */
export class UsersExport {
  async collection(): Promise<Record<string, unknown>[]> {
    const users = await User.all() as User[];
    return users.map((u) => ({
      id:           u.id,
      name:         u.name,
      email:        u.email,
      phone_number: u.phone_number ?? "",
      status:       u.status ?? 'active',
      created_at:   u.created_at,
    }));
  }

  headings(): string[] {
    return ['ID', 'Name', 'Email', 'Phone', 'Status', 'Created At'];
  }

  map(row: Record<string, unknown>): unknown[] {
    return [row.id, row.name, row.email, row.phone_number, row.status, row.created_at];
  }
}
