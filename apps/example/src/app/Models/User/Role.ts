import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';
import { Bind } from '@lara-node/router';
import Permission from './Permission';

@Bind()            // registers 'role' for route-model binding
@use(SoftDeletes)
export class Role extends Model {
  static fillable: string[] = ['name', 'slug', 'description', 'created_at', 'updated_at', 'deleted_at'];
  static casts: Record<string, string> = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' };

  permissions() {
    return this.belongsToMany(Permission, 'permissions_roles', 'roles_id', 'permissions_id');
  }
}

export default Role;
