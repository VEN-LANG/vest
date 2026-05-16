import "reflect-metadata";
import { container, Application } from "@lara-node/core";

// ---------------------------------------------------------------------------
// Framework service providers — from @lara-node/* packages
// ---------------------------------------------------------------------------
import { DatabaseServiceProvider } from "@lara-node/db";
import { CacheServiceProvider } from "@lara-node/cache";
import { EventServiceProvider, BroadcastServiceProvider } from "@lara-node/events";
import { QueueServiceProvider } from "@lara-node/queue";
import { MailServiceProvider } from "@lara-node/mail";
import { DocServiceProvider } from "@lara-node/router";
import { HorizonServiceProvider } from "@lara-node/horizon";
import { TelescopeServiceProvider } from "@lara-node/telescope";

// ---------------------------------------------------------------------------
// App-level providers — YOUR providers (edit these freely)
// ---------------------------------------------------------------------------
import { AppServiceProvider } from "../app/Providers/AppServiceProvider.js";
import { BroadcastServiceProvider as AppBroadcastServiceProvider } from "../app/Providers/BroadcastServiceProvider.js";
import { RouteServiceProvider } from "../app/Providers/RouteServiceProvider.js";
import { EventServiceProvider as AppEventServiceProvider } from "../app/Providers/EventServiceProvider.js";
import { QueueServiceProvider as AppQueueServiceProvider } from "../app/Providers/QueueServiceProvider.js";

// ---------------------------------------------------------------------------
// HTTP Kernel
// ---------------------------------------------------------------------------
import { Kernel as HttpKernel } from "../app/Http/Kernel.js";

export const app = new Application(container);

/**
 * startApplication — complete boot sequence.
 *
 * Provider ordering:
 *   1. Database / Cache  — must be up before any provider might query
 *   2. Events / Queue    — framework base, then app extends them
 *   3. Mail / Docs       — optional services
 *   4. Horizon/Telescope — monitoring (registered before routes so they can install watchers)
 *   5. App providers     — your code (services, routes, etc.)
 */
export async function bootForConsole(): Promise<void> {
  try {
    app.register(DatabaseServiceProvider);
    app.register(CacheServiceProvider);
    app.register(EventServiceProvider);
    app.register(AppEventServiceProvider);
    app.register(QueueServiceProvider);
    app.register(AppQueueServiceProvider);
    app.register(MailServiceProvider);
    app.register(DocServiceProvider);
    app.register(TelescopeServiceProvider);
    app.register(HorizonServiceProvider);
    app.register(AppServiceProvider);
    app.register(AppBroadcastServiceProvider);
    await app.boot();
  } catch (err) {
    console.error("Failed to boot application:", err);
    process.exit(1);
  }
}

export async function startApplication(): Promise<void> {
  const PORT = process.env.PORT ?? 3000;

  try {
    // Framework providers
    app.register(DatabaseServiceProvider);
    app.register(CacheServiceProvider);
    app.register(EventServiceProvider);
    app.register(AppEventServiceProvider); // extends EventServiceProvider with your listeners
    app.register(QueueServiceProvider);
    app.register(AppQueueServiceProvider); // extends QueueServiceProvider with your schedule
    app.register(MailServiceProvider);
    app.register(DocServiceProvider);
    app.register(TelescopeServiceProvider); // must come before routes to install request watcher
    app.register(HorizonServiceProvider);

    // App providers
    app.register(AppServiceProvider);
    app.register(AppBroadcastServiceProvider); // extends BroadcastServiceProvider with your channels
    app.register(RouteServiceProvider);

    // Boot HTTP kernel (registers global middleware + named aliases)
    const kernel = new HttpKernel(app);
    kernel.boot();

    // CORS / JSON / urlencoded base middleware
    app.configureBaseMiddleware();

    // Boot all registered providers
    await app.boot();

    // 404 handler + error handler (must come after routes)
    kernel.configureErrorHandling();

    // Start
    const httpServer = app.createHttpServer();
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.APP_ENV ?? "local"}`);
    });
  } catch (err) {
    console.error("Failed to start application:", err);
    process.exit(1);
  }
}

export default app;
