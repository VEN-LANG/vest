import Permission from "@app/Models/User/Permission";
import { ModelAttributes } from "@lara-node/db";

export class PermissionService {
  async list() {
    return Permission.all();
  }
  async find(id: number | string) {
    return Permission.find(id);
  }
  async create(data: ModelAttributes) {
    return Permission.create(data);
  }
  async update(id: number | string, data: ModelAttributes) {
    const perm = await Permission.find(id);
    if (!perm) return null;
    await (perm as any).update(data);
    return perm;
  }
  async delete(id: number | string) {
    const perm = await Permission.find(id);
    if (!perm) return false;
    await (perm as any).delete();
    return true;
  }
}

export default new PermissionService();
