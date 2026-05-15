import { ServiceProvider } from "@vest-ts/core";

export class RouteServiceProvider extends ServiceProvider {
  register(): void {}

  async boot(): Promise<void> {
    // Dynamic import ensures middleware aliases are registered by kernel.boot() first
    const { apiRouter } = await import("../../routes/api.js");
    this.app.mountRoutes("/api", apiRouter.build());
  }
}
