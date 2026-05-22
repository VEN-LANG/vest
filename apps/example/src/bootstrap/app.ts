import path from 'path';
import { container, Application } from '@lara-node/core';
import { modelRegistryMiddleware } from '@lara-node/router';
import { Kernel } from '../app/Http/Kernel';
import { AppServiceProvider } from '../app/Providers/AppServiceProvider';

export const app = new Application(container);

/*
|--------------------------------------------------------------------------
| Boot sequence (console — no HTTP kernel needed)
|--------------------------------------------------------------------------
*/
export async function bootForConsole(): Promise<void> {
  try {
    app.register(AppServiceProvider);
    await app.boot();
  } catch (err) {
    console.error('Failed to boot application:', err);
    process.exit(1);
  }
}

/*
|--------------------------------------------------------------------------
| Boot sequence (HTTP server)
|
| Order matters:
|   1. Register AppServiceProvider (cascades to all additionalProviders)
|   2. Boot HTTP Kernel — registers global middleware + named route aliases
|      so that when RouteServiceProvider.boot() lazily loads routes,
|      string aliases like 'auth' are already resolved.
|   3. configureBaseMiddleware (cors, json, urlencoded)
|   4. modelRegistryMiddleware — scans Models/ on the first request so that
|      route-model binding (:user → User instance) is ready before handlers run.
|   5. app.boot() — boots all providers (RouteServiceProvider mounts routes)
|   6. configureErrorHandling — must come after routes are mounted
|--------------------------------------------------------------------------
*/
export async function startApplication(): Promise<void> {
  const port = process.env.PORT ?? 3000;

  app.register(AppServiceProvider);

  const kernel = new Kernel(app);
  kernel.boot();

  app.configureBaseMiddleware();

  // Auto-load all Model subclasses so route-model binding resolves :param → model instance.
  // @Bind() decorators on each model fire when the file is required.
  app.useMiddleware(modelRegistryMiddleware(path.join(__dirname, '../app/Models')));

  await app.boot();

  kernel.configureErrorHandling(kernel.errorHandler);

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Environment: ${process.env.APP_ENV ?? 'local'}`);
  });
}

export default app;
