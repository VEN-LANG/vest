import { Command } from '@lara-node/console';
import type { ArgumentsCamelCase } from 'yargs';

const PERMISSIONS = [
  { slug: 'view_users', name: 'View Users' },
  { slug: 'create_users', name: 'Create Users' },
  { slug: 'update_users', name: 'Update Users' },
  { slug: 'delete_users', name: 'Delete Users' },
  { slug: 'add_roles_to_users', name: 'Add Roles To Users' },
  { slug: 'remove_roles_from_users', name: 'Remove Roles From Users' },
  { slug: 'activate_and_deactivate_users', name: 'Activate and Deactivate Users' },
  { slug: 'view_roles', name: 'View Roles' },
  { slug: 'create_roles', name: 'Create Roles' },
  { slug: 'update_roles', name: 'Update Roles' },
  { slug: 'delete_roles', name: 'Delete Roles' },
  { slug: 'add_permissions_to_roles', name: 'Add Permissions To Roles' },
  { slug: 'view_permissions', name: 'View Permissions' },
  { slug: 'create_permissions', name: 'Create Permissions' },
  { slug: 'update_permissions', name: 'Update Permissions' },
  { slug: 'delete_permissions', name: 'Delete Permissions' },
  { slug: 'view_files', name: 'View Files' },
  { slug: 'upload_files', name: 'Upload Files' },
  { slug: 'delete_files', name: 'Delete Files' },
];

export class PermissionsSyncCommand extends Command {
  protected signature = 'permissions:sync';
  protected description = 'Sync permissions to database and attach all to admin role';
  protected options = {
    'dry-run': { type: 'boolean' as const, description: 'Show without making changes', default: false },
    force: { type: 'boolean' as const, description: 'Force in production', default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const dryRun = args.dryRun as boolean;
    if (process.env.NODE_ENV === 'production' && !args.force) {
      this.error('Use --force in production'); return;
    }
    if (dryRun) this.info('Dry run mode');
    this.info('Syncing permissions...');

    try {
      const Permission = require('../../Models/User/Permission').default;
      const Role = require('../../Models/User/Role').default;
      const now = new Date();
      let created = 0, updated = 0;
      const syncedPerms: Array<{ id?: number }> = [];

      for (const p of PERMISSIONS) {
        let perm = await Permission.where('slug', p.slug).first();
        if (perm) {
          if (!dryRun) await perm.update({ name: p.name, updated_at: now });
          updated++;
        } else {
          if (!dryRun) perm = await Permission.create({ name: p.name, slug: p.slug, created_at: now, updated_at: now });
          created++;
        }
        if (perm) syncedPerms.push(perm);
        this.line(`  ${perm ? 'UPDATE' : 'CREATE'} ${p.slug}`);
      }

      let adminRole = await Role.where('slug', 'admin').first();
      if (!adminRole && !dryRun) {
        adminRole = await Role.create({ name: 'Admin', slug: 'admin', description: 'Administrator role', created_at: now, updated_at: now });
      }

      if (!dryRun && adminRole && syncedPerms.length) {
        const permIds = syncedPerms.map((p) => p?.id).filter(Boolean) as number[];
        try { await adminRole.permissions().sync(permIds); }
        catch { await adminRole.permissions().attach(permIds); }
      }

      this.info(`Created: ${created}, Updated: ${updated}, Total: ${PERMISSIONS.length}`);
    } catch (err) {
      this.error(`Failed: ${(err as Error).message}`); process.exit(1);
    }
  }
}

export class PermissionsListCommand extends Command {
  protected signature = 'permissions:list';
  protected description = 'List all available permissions';

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    this.info('Available Permissions:');
    this.line(`${'SLUG'.padEnd(35)} NAME`);
    this.line('-'.repeat(65));
    for (const p of PERMISSIONS) this.line(`${p.slug.padEnd(35)} ${p.name}`);
    this.info(`Total: ${PERMISSIONS.length}`);
  }
}
