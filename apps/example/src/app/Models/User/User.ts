import { Model, use } from '@lara-node/db';
import { SoftDeletes, Timestamps } from '@lara-node/db';
import { Injectable } from '@lara-node/core';
import { Bind } from '@lara-node/router';
import Role from './Role';
import UserProfile from './UserProfile';
import { RolesUsers } from './RolesUsers';

@Bind()            // registers 'user' for route-model binding — :user param auto-resolves
@Injectable()
@use(SoftDeletes, Timestamps)
export class User extends Model {
  static primaryKey = 'id';
  static fillable: string[] = [
    'name', 'email', 'email_verified_at', 'password', 'status',
    'last_login', 'last_seen_at', 'last_login_ip', 'default_role_id',
    'remember_token', 'avatar', 'phone_number', 'created_at', 'updated_at', 'deleted_at',
  ];
  static hidden: string[] = ['password', 'remember_token'];
  static casts: Record<string, string> = {
    created_at: 'datetime', updated_at: 'datetime', deleted_at: 'datetime',
    last_login: 'datetime', last_seen_at: 'datetime',
  };

  roles() {
    return this.belongsToMany(Role, RolesUsers.getTable(), 'users_id', 'roles_id');
  }

  profile() {
    return this.hasOne(UserProfile, 'user_id', 'id');
  }

  isActive(): boolean {
    const status = this.getAttribute('status') as string | undefined | null;
    return status === undefined || status === null || status === 'active';
  }
}

export default User;
