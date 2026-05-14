import { ServiceProvider } from "@vest/core";
import { getBroadcastManager, BroadcastManager } from "./Broadcasting/BroadcastManager.js";

/**
 * Framework BroadcastServiceProvider — registers the BroadcastManager singleton.
 *
 * In your app, create your own BroadcastServiceProvider that extends this and
 * overrides `channels()` to define channel authorization and `authenticator()`
 * to provide user resolution from a token.
 *
 * @example
 * // app/Providers/BroadcastServiceProvider.ts
 * import { BroadcastServiceProvider as BaseProvider } from '@vest/events';
 * import { Broadcast } from '@vest/events';
 *
 * export class BroadcastServiceProvider extends BaseProvider {
 *   protected channels(): void {
 *     Broadcast.private('notifications.{userId}', (user, userId) => user.id == userId);
 *   }
 * }
 */
export class BroadcastServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton(BroadcastManager, () => getBroadcastManager());
    this.container.alias(BroadcastManager, "broadcast");
  }

  async boot(): Promise<void> {
    const driver = process.env.BROADCAST_DRIVER ?? "null";
    if (driver === "null") return;

    const manager = getBroadcastManager();

    const httpServer = this.app.getHttpServer();
    if (httpServer) manager.setHttpServer(httpServer);

    await manager.initialize();

    this.channels();
  }

  /** Override in your app's BroadcastServiceProvider to define channel auth. */
  protected channels(): void {}
}
