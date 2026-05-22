import { ServiceProvider } from '@lara-node/core';
import { getEventDispatcher, getRegisteredListeners, getRegisteredSubscribers } from '@lara-node/events';

export class EventServiceProvider extends ServiceProvider {
  protected shouldDiscoverEvents = true;

  register(): void {}

  async boot(): Promise<void> {
    const dispatcher = getEventDispatcher();

    if (this.shouldDiscoverEvents) {
      try { await import('../Listeners/index'); } catch { /* empty */ }
      try { await import('../Subscribers/index'); } catch { /* empty */ }
    }

    for (const [ListenerClass, metadata] of getRegisteredListeners()) {
      for (const eventName of metadata.events) {
        dispatcher.listen(eventName, async (payload) => {
          const listener = new ListenerClass();
          if (listener.shouldHandle && !listener.shouldHandle(payload)) return;
          await listener.handle(payload);
        });
      }
    }

    for (const SubscriberClass of getRegisteredSubscribers()) {
      dispatcher.subscribe(SubscriberClass);
    }

    console.log('[EventServiceProvider] Event listeners registered');
  }
}
