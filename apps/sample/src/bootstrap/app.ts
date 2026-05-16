import "reflect-metadata";
import { container, Application } from "@lara-node/core";
import { DatabaseServiceProvider } from "@lara-node/db";
import { CacheServiceProvider } from "@lara-node/cache";
import { EventServiceProvider } from "@lara-node/events";
import { QueueServiceProvider } from "@lara-node/queue";
import { MailServiceProvider } from "@lara-node/mail";
import { DocServiceProvider } from "@lara-node/router";
import { TelescopeServiceProvider } from "@lara-node/telescope";

import { AppServiceProvider } from "../app/Providers/AppServiceProvider.js";
import { RouteServiceProvider } from "../app/Providers/RouteServiceProvider.js";
import { EventServiceProvider as AppEventServiceProvider } from "../app/Providers/EventServiceProvider.js";
import { Kernel as HttpKernel } from "../app/Http/Kernel.js";

export const app = new Application(container);

export async function bootForConsole(): Promise<void> {
  try {
    app.register(DatabaseServiceProvider);
    app.register(CacheServiceProvider);
    app.register(EventServiceProvider);
    app.register(QueueServiceProvider);
    app.register(MailServiceProvider);
    app.register(DocServiceProvider);
    app.register(TelescopeServiceProvider);
    app.register(AppEventServiceProvider);
    app.register(AppServiceProvider);
    await app.boot();
  } catch (err) {
    console.error("Failed to boot application:", err);
    process.exit(1);
  }
}

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
