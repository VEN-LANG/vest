import { ServiceProvider } from "./ServiceProvider.js";

/**
 * Base class for registering middleware aliases, groups, and priority.
 *
 * Extend this in your application and implement `registerMiddleware()`:
 *
 * @example
 * export class MiddlewareServiceProvider extends BaseMiddlewareServiceProvider {
 *   protected registerMiddleware(): void {
 *     this.middlewareAliases({
 *       auth: authMiddleware,
 *       can: (...perms) => authorizePermissions(...perms),
 *     });
 *     this.middlewareGroup('api', ['throttle:120,1']);
 *     this.middlewarePriority(['auth', 'must-be-active', 'can', 'role']);
 *   }
 * }
 */
export abstract class MiddlewareServiceProvider extends ServiceProvider {
  register(): void {
    this.registerMiddleware();
  }

  protected abstract registerMiddleware(): void;
}
