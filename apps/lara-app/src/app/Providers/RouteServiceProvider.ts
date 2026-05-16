import { ServiceProvider } from '@lara-node/core';
import RouterBuilder, { registerRouteBuilder } from '@lara-node/router';

export class RouteServiceProvider extends ServiceProvider {
  protected apiPrefix = '/api';

  register(): void {}

  boot(): void {
    this.mapApiRoutes();
    this.mapWebRoutes();
  }

  protected mapApiRoutes(): void {
    const { routesBuilder } = require('@routes/api');
    registerRouteBuilder(routesBuilder, 'api', this.apiPrefix);
    this.app.mountRoutes(this.apiPrefix, routesBuilder.build());
  }

  protected mapWebRoutes(): void {
    const { webRoutesBuilder } = require('@routes/web');
    registerRouteBuilder(webRoutesBuilder, 'web');
    this.app.mountRoutes('/', webRoutesBuilder.build());
  }
}
