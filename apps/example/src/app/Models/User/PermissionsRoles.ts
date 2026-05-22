import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';

@use(SoftDeletes)
export class PermissionsRoles extends Model {
  static table = 'permissions_roles';
  static fillable: string[] = ['permissions_id', 'roles_id', 'created_at', 'updated_at', 'deleted_at'];
  static casts: Record<string, string> = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' };
}

export default PermissionsRoles;
