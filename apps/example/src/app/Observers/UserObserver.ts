import { Observer, Observe } from '@lara-node/db';
import User from '../Models/User/User';

/*
|--------------------------------------------------------------------------
| UserObserver
|--------------------------------------------------------------------------
|
| Intercepts lifecycle events on the User model. @Observe(User) wires
| this class automatically — no manual User.observe(UserObserver) needed.
|
*/
@Observe(User)
export class UserObserver extends Observer<User> {
  creating(user: User): void {
    if (!user.status) user.setAttribute('status', 'active');
  }

  created(user: User): void {
    console.log(`[UserObserver] User created: ${user.email}`);
  }

  updating(user: User): void {
    user.setAttribute('updated_at', new Date());
  }

  deleting(user: User): void {
    console.log(`[UserObserver] User soft-deleted: ${user.id}`);
  }
}
