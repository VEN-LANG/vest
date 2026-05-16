import { Model, use, SoftDeletes, Timestamps } from '@lara-node/db';

@use(SoftDeletes, Timestamps)
export class Role extends Model {
  static fillable = ['name', 'slug', 'description', 'created_at', 'updated_at', 'deleted_at'];
  static casts: Record<string, string> = { created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime' };
}

export default Role;
