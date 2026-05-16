import { Model, use, SoftDeletes, Timestamps } from '@lara-node/db';
import { Injectable } from '@lara-node/core';
import { UserObserver } from '../Observers/UserObserver';

@Injectable()
@use(SoftDeletes, Timestamps)
export class User extends Model {
  static primaryKey = 'id';
  static fillable = ['name', 'email', 'password', 'status', 'last_login', 'created_at', 'updated_at', 'deleted_at'];
  static hidden = ['password'];
  static casts: Record<string, string> = {
    created_at: 'datetime', updated_at: 'datetime',
    deleted_at: 'datetime', last_login: 'datetime',
  };
  static observer = UserObserver;

  isActive(): boolean {
    const status = this.getAttribute('status') as string | null | undefined;
    return !status || status === 'active';
  }
}

export default User;
