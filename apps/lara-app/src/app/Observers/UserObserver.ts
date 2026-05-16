import { Observer } from '@lara-node/db';
import User from '../Models/User';

export class UserObserver extends Observer<User> {
  creating(user: User): void {
    if (!user.getAttribute('status')) user.setAttribute('status', 'active');
  }

  created(user: User): void {
    console.log(`[UserObserver] User created: ${user.getAttribute('email') as string}`);
  }

  updating(user: User): void {
    user.setAttribute('updated_at', new Date());
  }

  deleting(user: User): void {
    console.log(`[UserObserver] User soft-deleted: ${user.getAttribute('id') as number}`);
  }
}
