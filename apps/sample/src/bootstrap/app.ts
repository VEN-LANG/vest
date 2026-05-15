import "reflect-metadata";
import { container, Application } from "@vest-ts/core";
import { DatabaseServiceProvider } from "@vest-ts/db";
import { CacheServiceProvider } from "@vest-ts/cache";
import { EventServiceProvider } from "@vest-ts/events";
import { QueueServiceProvider } from "@vest-ts/queue";
import { MailServiceProvider } from "@vest-ts/mail";
import { DocServiceProvider } from "@vest-ts/router";
import { TelescopeServiceProvider } from "@vest-ts/telescope";

import { AppServiceProvider } from "../app/Providers/AppServiceProvider.js";
import { RouteServiceProvider } from "../app/Providers/RouteServiceProvider.js";
import { EventServiceProvider as AppEventServiceProvider } from "../app/Providers/EventServiceProvider.js";
import { Kernel as HttpKernel } from "../app/Http/Kernel.js";

export const app = new Application(container);

export async function startApplication(): Promise<void> {
  const port = process.env.PORT ?? 3001;

  try {
    // Framework providers
    app.register(DatabaseServiceProvider);
    app.register(CacheServiceProvider);
    app.register(EventServiceProvider);
    app.register(QueueServiceProvider);
    app.register(MailServiceProvider);
    app.register(DocServiceProvider);
    app.register(TelescopeServiceProvider);

    // App providers
    app.register(AppEventServiceProvider);
    app.register(AppServiceProvider);
    app.register(RouteServiceProvider); // routes loaded last (after kernel.boot)

    // Register global middleware + named aliases before routes evaluate
    const kernel = new HttpKernel(app);
    kernel.boot();

    app.configureBaseMiddleware();
    await app.boot();
    kernel.configureErrorHandling();

    const server = app.createHttpServer();
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Docs at http://localhost:${port}/docs`);
    });
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
}

export default app;
