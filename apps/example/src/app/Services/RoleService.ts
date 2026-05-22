import { Injectable } from '@lara-node/core';
import Role from '../Models/User/Role';

type RoleWithRelations = Role & {
  permissions: () => { sync: (ids: number[]) => Promise<void> };
};

@Injectable()
export class RoleService {
  async index() { return Role.with(['permissions']).all(); }
  async find(id: number | string) { return Role.with(['permissions']).find(id); }

  async create(data: { name: string; slug: string; description?: string }) {
    return Role.create({ ...data, created_at: new Date(), updated_at: new Date() });
  }

  async update(id: number | string, data: Record<string, unknown>) {
    const role = await Role.find(id) as Role | null;
    if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
    await role.update({ ...data, updated_at: new Date() });
    return role;
  }

  async destroy(id: number | string) {
    const role = await Role.find(id) as Role | null;
    if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
    await role.delete();
  }

  async syncPermissions(roleId: number | string, permissionIds: number[]) {
    const role = await Role.find(roleId) as RoleWithRelations | null;
    if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
    await role.permissions().sync(permissionIds);
    return Role.with(['permissions']).find(roleId);
  }
}
