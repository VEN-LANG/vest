import { EventServiceProvider as BaseProvider } from "@lara-node/events";

/**
 * EventServiceProvider
 *
 * Override `listen` for manual event→listener mappings,
 * or override `discoverListeners()` to import your listeners directory.
 * Use the @ListensTo decorator on listener classes for automatic discovery.
 */
export class EventServiceProvider extends BaseProvider {
  protected override listen: Record<string, Array<new () => any>> = {
    // 'user.registered': [SendWelcomeEmail],
  };

  protected override subscribe: Array<new () => any> = [
    // UserEventSubscriber,
  ];

  protected override async discoverListeners(): Promise<void> {
    // Import to trigger @ListensTo decorator registration
    await import("../Listeners/index.js");
  }

  protected override async discoverSubscribers(): Promise<void> {
    await import("../Subscribers/index.js");
  }
}
