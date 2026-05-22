import { Model, use } from '@lara-node/db';
import { SoftDeletes } from '@lara-node/db';

@use(SoftDeletes)
export class UserProfile extends Model {
  static table = 'user_profiles';
  static fillable: string[] = [
    'user_id', 'gender', 'id_number', 'city', 'country',
    'address', 'zip_code', 'date_of_birth', 'metadata',
    'created_at', 'updated_at', 'deleted_at',
  ];
  static casts: Record<string, string> = {
    date_of_birth: 'datetime', metadata: 'json',
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
  };
}

export default UserProfile;
