import { ServiceProvider } from '@lara-node/core';
import RouterBuilder, { registerRouteBuilder } from '@lara-node/router';

/*
|--------------------------------------------------------------------------
| RouteServiceProvider
|--------------------------------------------------------------------------
|
| Route-model binding is handled automatically by modelRegistryMiddleware
| in bootstrap/app.ts — every Model decorated with @Bind() is registered
| when src/app/Models/ is first scanned on the initial request.
|
| To register additional models manually (e.g. from outside Models/):
|
|   register(): void {
|     super.register();
|     RouterBuilder.registerModel('product', Product);
|   }
|
| boot() — lazily loads route files AFTER the HTTP Kernel has registered
|          all named middleware aliases (auth, can, role, etc.).
|
| Route-model binding example:
|   g.get('/:user', 'auth', [UserController, 'show']);
|
|   async show(req: Request, res: Response) {
|     const user = req.params.user as unknown as User; // auto-loaded
|     res.json({ success: true, data: user });
|   }
|
*/
export class RouteServiceProvider extends ServiceProvider {
  protected apiPrefix = '/api';

  register(): void {}

  boot(): void {
    this.mapApiRoutes();
    this.mapWebRoutes();
    this.mapChannelRoutes();
  }

  protected mapApiRoutes(): void {
    const { routesBuilder } = require('@routes/api');
    // registerRouteBuilder scans routes for OpenAPI and mounts them in one call.
    registerRouteBuilder(routesBuilder, 'api', this.apiPrefix, this.app);
  }

  protected mapWebRoutes(): void {
    const { webRoutesBuilder } = require('@routes/web');
    registerRouteBuilder(webRoutesBuilder, 'web', '/', this.app);
  }
  
  protected mapChannelRoutes(): void {
    const { channelRouter } = require('@routes/channels');
    this.app.mountRoutes('/broadcasting', channelRouter);
  }
}
