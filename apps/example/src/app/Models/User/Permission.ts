import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';
import { Bind } from '@lara-node/router';

@Bind()            // registers 'permission' for route-model binding
@use(SoftDeletes)
export class Permission extends Model {
  static table = 'permissions';
  static fillable: string[] = ['name', 'slug', 'description', 'created_at', 'updated_at', 'deleted_at'];
  static casts: Record<string, string> = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' };
}

export default Permission;
