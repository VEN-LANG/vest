import { MiddlewareServiceProvider as BaseProvider } from '@lara-node/core';
import {
  AuthMiddleware,
  AuthorizeByStatusMiddleware,
  authorizeRoles,
  authorizePermissions,
} from '@lara-node/middlewares';
import User from '../Models/User/User';

type UserWithRelations = User & {
  roles: Array<{ slug: string; permissions: Array<{ slug: string }> }>;
};

/*
|--------------------------------------------------------------------------
| MiddlewareServiceProvider
|--------------------------------------------------------------------------
|
| Register named middleware aliases, groups, and priority here.
| This provider runs before RouteServiceProvider so all aliases are
| available when route files are lazily loaded in boot().
|
| Aliases are used in routes:
|   g.get('/me', 'auth', [AuthController, 'me']);
|   g.get('/admin', 'role:admin', [UserController, 'index']);
|   g.get('/resource', 'can:view_resource', [Controller, 'index']);
|
*/
export class MiddlewareServiceProvider extends BaseProvider {
  protected registerMiddleware(): void {
    this.middlewareAliases({
      auth: new AuthMiddleware({
        userLoader: async (uid) => {
          const user = await User.with(['profile', 'roles', 'roles.permissions']).find(uid) as UserWithRelations | null;
          if (!user) return null;
          await user.update({ last_seen_at: new Date() });
          const roles = user.roles ?? [];
          const perms = roles.flatMap((r) => r.permissions ?? []);
          return {
            id: user.getAttribute('id') as number,
            roles: roles.map((r) => r.slug),
            permissions: perms.map((p) => p.slug),
            model: user,
          };
        },
      }).toHandler(),
      'must-be-active': AuthorizeByStatusMiddleware,
      can: (...perms: string[]) => authorizePermissions(...perms),
      role: (...roles: string[]) => authorizeRoles(...roles),
    });

    this.middlewareGroup('web', []);

    this.middlewareGroup('api', [
      // 'throttle:120,1',
    ]);

    this.middlewarePriority(['auth', 'must-be-active', 'can', 'role']);
  }
}
