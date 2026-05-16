import type { Model } from "./Model.js";
import type { Observer } from "./Observers/Observer.js";

/**
 * @Observe(ModelClass)
 *
 * Class decorator that automatically wires an Observer to its target Model.
 * Eliminates the need to call `Model.observe(ObserverClass)` in bootstrap.
 *
 * @example
 * import { Observer, Observe } from '@lara-node/db';
 * import { User } from '../Models/User';
 *
 * @Observe(User)
 * export class UserObserver extends Observer<User> {
 *   created(user: User) { ... }
 *   deleted(user: User) { ... }
 * }
 */
export function Observe(modelClass: typeof Model) {
  return function <T extends new (...args: any[]) => Observer<any>>(target: T): T {
    (modelClass as any).observe(target);
    return target;
  };
}
