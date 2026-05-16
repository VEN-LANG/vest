import { MiddlewareServiceProvider as BaseProvider } from '@lara-node/core';
import { AuthMiddleware, authorizePermissions, authorizeRoles } from '@lara-node/middlewares';
import User from '../Models/User';

export class MiddlewareServiceProvider extends BaseProvider {
  protected registerMiddleware(): void {
    this.middlewareAliases({
      auth: new AuthMiddleware({
        userLoader: async (uid) => {
          const user = await User.find(uid as number);
          if (!user) return null;
          return { id: user.getAttribute('id') as number, roles: [], permissions: [], model: user };
        },
      }).toHandler(),
      can: (...perms: string[]) => authorizePermissions(...perms),
      role: (...roles: string[]) => authorizeRoles(...roles),
    });
  }
}
