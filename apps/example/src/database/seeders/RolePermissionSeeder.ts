import Role from '../../app/Models/User/Role';
import Permission from '../../app/Models/User/Permission';

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

type RoleModel = Role & { permissions: () => { sync: (ids: number[]) => Promise<void>; attach: (ids: number[]) => Promise<void> } };

export class RolePermissionSeeder {
  async run(): Promise<{ adminRole: RoleModel; userRole: RoleModel; permIds: number[] }> {
    const now = new Date();
    console.log('  Seeding roles...');

    let adminRole = await Role.where('slug', 'admin').first() as RoleModel | null;
    if (!adminRole) {
      adminRole = await Role.create({ name: 'Admin', slug: 'admin', description: 'Administrator with full access', created_at: now, updated_at: now }) as RoleModel;
    }

    let userRole = await Role.where('slug', 'user').first() as RoleModel | null;
    if (!userRole) {
      userRole = await Role.create({ name: 'User', slug: 'user', description: 'Regular user', created_at: now, updated_at: now }) as RoleModel;
    }

    console.log('  Seeding permissions...');
    const permIds: number[] = [];
    for (const p of PERMISSIONS) {
      let perm = await Permission.where('slug', p.slug).first() as Permission | null;
      if (!perm) {
        perm = await Permission.create({ name: p.name, slug: p.slug, created_at: now, updated_at: now }) as Permission;
      }
      const id = perm?.getAttribute('id') as number | undefined;
      if (id) permIds.push(id);
    }

    try { await adminRole.permissions().sync(permIds); }
    catch { await adminRole.permissions().attach(permIds); }

    console.log(`  ✓ ${PERMISSIONS.length} permissions synced to admin role`);
    return { adminRole, userRole: userRole!, permIds };
  }
}
