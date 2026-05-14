import Role from "@app/Models/User/Role";
import { ModelAttributes } from "@vest/db";
import PermissionsRoles from "@app/Models/User/PermissionsRoles";

export class RoleService {
  async list() {
    return Role.with(["permissions"]).all();
  }
  async find(id: number | string) {
    return Role.with(["permissions"]).find(id);
  }
  async create(data: ModelAttributes) {
    return Role.create(data);
  }
  async update(id: number | string, data: ModelAttributes) {
    const role = await Role.find(id);
    if (!role) return null;
    if (role.slug == "admin") {
      throw new Error("Admin role cannot be updated");
    }
    await (role as any).update(data);
    return role;
  }
  async delete(id: number | string) {
    const role = await Role.find(id);
    if (!role) return false;
    if (role.slug == "admin") {
      throw new Error("Admin role cannot be updated");
    }
    await role.delete();
    return true;
  }
  async attachPermissions(roleId: number | string, permissionIds: (number | string)[]) {
    let role = await Role.find(roleId);
    if (!role) return null;
    if (role.slug == "admin") {
      throw new Error("Admin role cannot be updated");
    }
    // clear existing
    const result = await PermissionsRoles.query().withTrashed().where("roles_id", roleId).get();
    if (result && result.length > 0) {
      for (const item of result) {
        await item.delete(true);
      }
    }
    if (permissionIds.length) {
      // create pivot rows
      for (const pid of permissionIds) {
        await PermissionsRoles.create({ permissions_id: pid, roles_id: roleId });
      }
    }
    role = await Role.query().with(["permissions"]).find(roleId);
    return role;
  }
}

export default new RoleService();
