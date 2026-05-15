import { ServiceProvider } from "@vest-ts/core";
import { getEventDispatcher } from "./Events/EventDispatcher.js";
import type { ListenerRegistration } from "./Events/EventDispatcher.js";
import { getRegisteredListeners, getRegisteredSubscribers } from "./Events/EventDecorators.js";

/**
 * Framework EventServiceProvider — auto-discovers and registers listeners/subscribers
 * that were decorated with @ListensTo and @Subscribe.
 *
 * In your app, extend this and override `listen` / `subscribe` to add manual registrations,
 * or override `discoverListeners()` to point at your own directories.
 *
 * @example
 * // app/Providers/EventServiceProvider.ts
 * import { EventServiceProvider as BaseProvider } from '@vest-ts/events';
 * import { UserRegisteredListener } from '../Listeners/UserRegisteredListener.js';
 *
 * export class EventServiceProvider extends BaseProvider {
 *   protected listen = {
 *     'user.registered': [UserRegisteredListener],
 *   };
 * }
 */
export class EventServiceProvider extends ServiceProvider {
  /** Manual event → listener mappings (supplement decorator-based discovery). */
  protected listen: Record<string, Array<new () => any>> = {};

  /** Manual subscriber classes. */
  protected subscribe: Array<new () => any> = [];

  /** Set false to skip auto-discovery of decorator-registered listeners. */
  protected shouldDiscoverEvents = true;

  register(): void {
    this.container.singleton("events", () => getEventDispatcher());
  }

  async boot(): Promise<void> {
    const dispatcher = getEventDispatcher();

    if (this.shouldDiscoverEvents) {
      await this.discoverListeners();
      await this.discoverSubscribers();
    }

    for (const [event, listeners] of Object.entries(this.listen)) {
      for (const ListenerClass of listeners) {
        this.registerListener(dispatcher, event, ListenerClass);
      }
    }

    for (const [ListenerClass, meta] of getRegisteredListeners()) {
      for (const event of meta.events) {
        if (meta.shouldQueue) {
          const reg: ListenerRegistration = {
            listener: (p) => new ListenerClass().handle(p),
            shouldQueue: true,
            queueConfig: meta.queueConfig,
            listenerClass: ListenerClass,
          };
          dispatcher.listenQueued(event, reg);
        } else {
          this.registerListener(dispatcher, event, ListenerClass);
        }
      }
    }

    for (const SubscriberClass of this.subscribe) {
      dispatcher.subscribe(SubscriberClass);
    }

    for (const SubscriberClass of getRegisteredSubscribers()) {
      dispatcher.subscribe(SubscriberClass);
    }
  }

  private registerListener(
    dispatcher: ReturnType<typeof getEventDispatcher>,
    event: string,
    ListenerClass: new () => any,
  ): void {
    const instance = new ListenerClass();
    if (typeof instance.handle !== "function") return;

    if (instance.shouldQueue) {
      dispatcher.listenQueued(event, {
        listener: (p) => instance.handle(p),
        shouldQueue: true,
        queueConfig: {
          connection: instance.connection,
          queue: instance.queue,
          delay: instance.delay,
          tries: instance.tries,
          timeout: instance.timeout,
        },
        listenerClass: ListenerClass,
      });
    } else {
      dispatcher.listen(event, async (payload) => {
        if (instance.shouldHandle && !instance.shouldHandle(payload)) return;
        try {
          await instance.handle(payload);
        } catch (err) {
          if (instance.failed) instance.failed(payload, err as Error);
          throw err;
        }
      });
    }
  }

  /**
   * Override to import your app's listeners directory so decorators run.
   * @example
   * protected async discoverListeners() {
   *   await import('../Listeners/index.js');
   * }
   */
  protected async discoverListeners(): Promise<void> {}

  /**
   * Override to import your app's subscribers directory.
   */
  protected async discoverSubscribers(): Promise<void> {}
}
