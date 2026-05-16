import { ServiceProvider } from '@lara-node/core';
import { getEventDispatcher, getRegisteredListeners, getRegisteredSubscribers } from '@lara-node/events';

export class EventServiceProvider extends ServiceProvider {
  register(): void {}

  async boot(): Promise<void> {
    const dispatcher = getEventDispatcher();
    try { await import('../Listeners/UserListeners'); } catch { /* empty */ }
    try { await import('../Subscribers/UserEventSubscriber'); } catch { /* empty */ }

    for (const [ListenerClass, metadata] of getRegisteredListeners()) {
      for (const eventName of metadata.events) {
        dispatcher.listen(eventName, async (payload) => {
          const listener = new ListenerClass();
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
