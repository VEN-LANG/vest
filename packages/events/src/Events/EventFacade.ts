/*
|--------------------------------------------------------------------------
| Event Facade
|--------------------------------------------------------------------------
|
| This provides a Laravel-like Event facade with static methods for
| dispatching events, registering listeners, and testing helpers.
|
| Supports:
| - Event.listen(EventClass, ListenerClass)
| - Event.listen(event, callback)
| - Event.listen(queueable(callback).onQueue('name').catch(handler))
| - Event.listen('event.*', wildcardHandler)
|
*/

import {
  EventDispatcher,
  EventListener,
  EventSubscriber,
  getEventDispatcher,
  setEventDispatcher,
  ListenerRegistration,
} from "./EventDispatcher.js";

/*
|--------------------------------------------------------------------------
| Interfaces
|--------------------------------------------------------------------------
*/

/**
 * Interface for events/listeners that should be queued.
 */
export interface ShouldQueue {
  /**
   * The name of the connection the job should be sent to.
   */
  connection?: string;

  /**
   * The name of the queue the job should be sent to.
   */
  queue?: string;

  /**
   * The number of seconds to wait before processing the job.
   */
  delay?: number;

  /**
   * The number of times the job may be attempted.
   */
  tries?: number;

  /**
   * The number of seconds the job can run before timing out.
   */
  timeout?: number;
}

/**
 * Interface for events that should broadcast.
 */
export interface ShouldBroadcast {
  /**
   * Get the channels the event should broadcast on.
   */
  broadcastOn(): string | string[];

  /**
   * The event's broadcast name.
   */
  broadcastAs?(): string;

  /**
   * Get the data to broadcast.
   */
  broadcastWith?(): Record<string, any>;
}

/**
 * Dispatched event record for testing.
 */
export interface DispatchedEvent {
  eventName: string;
  payload: any;
  timestamp: number;
}

/*
|--------------------------------------------------------------------------
| Fake Event Dispatcher (for testing)
|--------------------------------------------------------------------------
*/

export class FakeEventDispatcher extends EventDispatcher {
  private dispatchedEvents: DispatchedEvent[] = [];
  private eventsToFake: string[] | null = null;
  private eventsToDispatch: string[] = [];
  private originalDispatcher: EventDispatcher | null = null;

  constructor(eventsToFake?: string[]) {
    super();
    this.eventsToFake = eventsToFake || null;
  }

  /**
   * Specify events that should not be faked.
   */
  except(events: string[]): this {
    this.eventsToDispatch = events;
    return this;
  }

  /**
   * Dispatch an event and record it.
   */
  async dispatch(event: string, payload?: any): Promise<void> {
    // If event should not be faked, dispatch normally
    if (this.shouldDispatchNormally(event)) {
      if (this.originalDispatcher) {
        return this.originalDispatcher.dispatch(event, payload);
      }
      return super.dispatch(event, payload);
    }

    // Record the event
    this.dispatchedEvents.push({
      eventName: event,
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if event should be dispatched normally.
   */
  private shouldDispatchNormally(event: string): boolean {
    // If we have specific events to fake and this isn't one of them, dispatch normally
    if (this.eventsToFake && !this.eventsToFake.includes(event)) {
      return true;
    }

    // If this event is in the except list, dispatch normally
    if (this.eventsToDispatch.includes(event)) {
      return true;
    }

    return false;
  }

  /**
   * Set the original dispatcher for passing through events.
   */
  setOriginalDispatcher(dispatcher: EventDispatcher): void {
    this.originalDispatcher = dispatcher;
  }

  /**
   * Get all dispatched events.
   */
  getDispatchedEvents(): DispatchedEvent[] {
    return this.dispatchedEvents;
  }

  /**
   * Get dispatched events for a specific event name.
   */
  getDispatchedEventsFor(eventName: string): DispatchedEvent[] {
    return this.dispatchedEvents.filter((e) => e.eventName === eventName);
  }

  /**
   * Check if an event was dispatched.
   */
  hasDispatched(event: string, callback?: (payload: any) => boolean): boolean {
    const events = this.getDispatchedEventsFor(event);

    if (events.length === 0) {
      return false;
    }

    if (callback) {
      return events.some((e) => callback(e.payload));
    }

    return true;
  }

  /**
   * Get the count of dispatched events.
   */
  dispatchedCount(event: string): number {
    return this.getDispatchedEventsFor(event).length;
  }

  /**
   * Clear all recorded events.
   */
  clearDispatched(): void {
    this.dispatchedEvents = [];
  }
}

/*
|--------------------------------------------------------------------------
| Queueable Listener Builder
|--------------------------------------------------------------------------
|
| Provides a fluent interface for configuring queued listeners.
| Usage: Event.listen(queueable(handler).onQueue('emails').catch(errorHandler))
|
*/

export class QueueableListener<T = any> {
  private handler: (payload: T) => void | Promise<void>;
  private errorHandler?: (payload: T, error: Error) => void;
  private _connection?: string;
  private _queue?: string;
  private _delay?: number;
  private _tries?: number;
  private _timeout?: number;

  constructor(handler: (payload: T) => void | Promise<void>) {
    this.handler = handler;
  }

  /**
   * Set the queue connection.
   */
  onConnection(connection: string): this {
    this._connection = connection;
    return this;
  }

  /**
   * Set the queue name.
   */
  onQueue(queue: string): this {
    this._queue = queue;
    return this;
  }

  /**
   * Set delay in seconds.
   */
  delay(seconds: number): this {
    this._delay = seconds;
    return this;
  }

  /**
   * Set the number of retry attempts.
   */
  tries(count: number): this {
    this._tries = count;
    return this;
  }

  /**
   * Set the timeout in seconds.
   */
  timeout(seconds: number): this {
    this._timeout = seconds;
    return this;
  }

  /**
   * Set the error handler for when the queued listener fails.
   */
  catch(handler: (payload: T, error: Error) => void): this {
    this.errorHandler = handler;
    return this;
  }

  /**
   * Get the handler function.
   */
  getHandler(): (payload: T) => void | Promise<void> {
    return this.handler;
  }

  /**
   * Get the error handler function.
   */
  getErrorHandler(): ((payload: T, error: Error) => void) | undefined {
    return this.errorHandler;
  }

  /**
   * Get the queue configuration.
   */
  getQueueConfig(): {
    connection?: string;
    queue?: string;
    delay?: number;
    tries?: number;
    timeout?: number;
  } {
    return {
      connection: this._connection,
      queue: this._queue,
      delay: this._delay,
      tries: this._tries,
      timeout: this._timeout,
    };
  }

  /**
   * Check if this is a queueable listener.
   */
  isQueueable(): boolean {
    return true;
  }
}

/**
 * Create a queueable listener with fluent configuration.
 *
 * @example
 * Event.listen('user.registered', queueable((payload) => {
 *     sendWelcomeEmail(payload);
 * }).onQueue('emails').catch((payload, error) => {
 *     console.error('Failed to send email', error);
 * }));
 */
export function queueable<T = any>(
  handler: (payload: T) => void | Promise<void>,
): QueueableListener<T> {
  return new QueueableListener(handler);
}

/*
|--------------------------------------------------------------------------
| Event Facade
|--------------------------------------------------------------------------
*/

class EventFacadeClass {
  private static fakeDispatcher: FakeEventDispatcher | null = null;
  private static originalDispatcher: EventDispatcher | null = null;

  /*
    |--------------------------------------------------------------------------
    | Core Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Dispatch an event.
   */
  static async dispatch(event: string, payload?: any): Promise<void> {
    return getEventDispatcher().dispatch(event, payload);
  }

  /**
   * Dispatch an event synchronously.
   */
  static dispatchSync(event: string, payload?: any): void {
    return getEventDispatcher().dispatchSync(event, payload);
  }

  /**
   * Dispatch an event without waiting.
   */
  static dispatchNow(event: string, payload?: any): void {
    return getEventDispatcher().dispatchNow(event, payload);
  }

  /**
   * Register an event listener.
   *
   * Supports multiple signatures:
   * - Event.listen('event.name', callback)
   * - Event.listen('event.*', wildcardCallback)
   * - Event.listen(EventClass, ListenerClass)
   * - Event.listen('event.name', queueable(callback).onQueue('name'))
   *
   * @example
   * // Simple callback
   * Event.listen('user.registered', (payload) => {
   *     console.log('User registered:', payload);
   * });
   *
   * // Wildcard listener
   * Event.listen('user.*', (eventName, payload) => {
   *     console.log(`Event ${eventName}:`, payload);
   * });
   *
   * // Queueable listener
   * Event.listen('order.created', queueable((payload) => {
   *     processOrder(payload);
   * }).onQueue('orders').catch((payload, error) => {
   *     console.error('Order processing failed', error);
   * }));
   *
   * // Class-based (Laravel style)
   * Event.listen(UserRegistered, SendWelcomeEmail);
   */
  static listen(
    event: string | string[] | (new (...args: any[]) => any),
    listener: EventListener | QueueableListener | (new () => any),
  ): typeof EventFacadeClass {
    const dispatcher = getEventDispatcher();

    // Handle class-based event/listener registration
    if (typeof event === "function" && typeof listener === "function") {
      // Event.listen(EventClass, ListenerClass)
      const EventClass = event as new (...args: any[]) => any;
      const ListenerClass = listener as new () => any;

      // Get event name from class
      const eventInstance = new EventClass();
      const eventName =
        typeof eventInstance.eventName === "function" ? eventInstance.eventName() : EventClass.name;

      // Create listener wrapper
      const listenerInstance = new ListenerClass();
      if (typeof listenerInstance.handle === "function") {
        dispatcher.listen(eventName, (payload) => listenerInstance.handle(payload));
      }
      return this;
    }

    // Handle QueueableListener
    if (listener instanceof QueueableListener) {
      const queueableListener = listener as QueueableListener;
      const config = queueableListener.getQueueConfig();
      const handler = queueableListener.getHandler();
      const errorHandler = queueableListener.getErrorHandler();

      // Wrap handler with error handling
      const wrappedHandler: EventListener = async (payload) => {
        try {
          await handler(payload);
        } catch (error) {
          if (errorHandler) {
            errorHandler(payload, error as Error);
          } else {
            throw error;
          }
        }
      };

      // Register as queued listener if has queue config
      if (config.queue || config.connection) {
        const registration: ListenerRegistration = {
          listener: wrappedHandler,
          shouldQueue: true,
          queueConfig: config,
        };
        dispatcher.listenQueued(event as string | string[], registration);
      } else {
        dispatcher.listen(event as string | string[], wrappedHandler);
      }
      return this;
    }

    // Standard listener registration
    dispatcher.listen(event as string | string[], listener as EventListener);
    return this;
  }

  /**
   * Register a listener that should be queued.
   */
  static listenQueued(
    event: string | string[],
    listener: EventListener | QueueableListener,
  ): typeof EventFacadeClass {
    const dispatcher = getEventDispatcher();

    if (listener instanceof QueueableListener) {
      const config = listener.getQueueConfig();
      const handler = listener.getHandler();
      const errorHandler = listener.getErrorHandler();

      const wrappedHandler: EventListener = async (payload) => {
        try {
          await handler(payload);
        } catch (error) {
          if (errorHandler) {
            errorHandler(payload, error as Error);
          } else {
            throw error;
          }
        }
      };

      const registration: ListenerRegistration = {
        listener: wrappedHandler,
        shouldQueue: true,
        queueConfig: config,
      };
      dispatcher.listenQueued(event, registration);
    } else {
      dispatcher.listenQueued(event, listener as EventListener);
    }
    return this;
  }

  /**
   * Register an event listener that runs once.
   */
  static once(event: string, listener: EventListener): typeof EventFacadeClass {
    getEventDispatcher().once(event, listener);
    return this;
  }

  /**
   * Register an event subscriber.
   */
  static subscribe(
    subscriber: EventSubscriber | (new () => EventSubscriber),
  ): typeof EventFacadeClass {
    getEventDispatcher().subscribe(subscriber);
    return this;
  }

  /**
   * Remove a listener.
   */
  static forget(event: string, listener?: EventListener): typeof EventFacadeClass {
    getEventDispatcher().forget(event, listener);
    return this;
  }

  /**
   * Flush all listeners for an event or all events.
   */
  static flush(event?: string): typeof EventFacadeClass {
    if (event) {
      getEventDispatcher().forget(event);
    } else {
      getEventDispatcher().flush();
    }
    return this;
  }

  /**
   * Get listeners for an event.
   */
  static getListeners(event: string): EventListener[] {
    return getEventDispatcher().getListeners(event);
  }

  /**
   * Check if event has listeners.
   */
  static hasListeners(event: string): boolean {
    return getEventDispatcher().hasListeners(event);
  }

  /**
   * Register a catch-all listener that receives all events.
   */
  static catch(listener: (data: { event: string; payload: any }) => void): typeof EventFacadeClass {
    getEventDispatcher().catch(listener);
    return this;
  }

  /*
    |--------------------------------------------------------------------------
    | Testing Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Replace the event dispatcher with a fake for testing.
   */
  static fake(events?: string[]): FakeEventDispatcher {
    this.originalDispatcher = getEventDispatcher();
    this.fakeDispatcher = new FakeEventDispatcher(events);
    this.fakeDispatcher.setOriginalDispatcher(this.originalDispatcher);
    setEventDispatcher(this.fakeDispatcher);
    return this.fakeDispatcher;
  }

  /**
   * Restore the original event dispatcher.
   */
  static restore(): void {
    if (this.originalDispatcher) {
      setEventDispatcher(this.originalDispatcher);
      this.fakeDispatcher = null;
      this.originalDispatcher = null;
    }
  }

  /**
   * Assert that an event was dispatched.
   */
  static assertDispatched(event: string, callback?: ((payload: any) => boolean) | number): void {
    if (!this.fakeDispatcher) {
      throw new Error("Event facade has not been faked. Call Event.fake() first.");
    }

    const events = this.fakeDispatcher.getDispatchedEventsFor(event);

    if (typeof callback === "number") {
      // Assert dispatched a specific number of times
      if (events.length !== callback) {
        throw new Error(
          `Expected event [${event}] to be dispatched ${callback} times, but was dispatched ${events.length} times.`,
        );
      }
      return;
    }

    if (!this.fakeDispatcher.hasDispatched(event, callback as any)) {
      throw new Error(`The expected event [${event}] was not dispatched.`);
    }
  }

  /**
   * Assert that an event was NOT dispatched.
   */
  static assertNotDispatched(event: string, callback?: (payload: any) => boolean): void {
    if (!this.fakeDispatcher) {
      throw new Error("Event facade has not been faked. Call Event.fake() first.");
    }

    if (this.fakeDispatcher.hasDispatched(event, callback)) {
      throw new Error(`The unexpected event [${event}] was dispatched.`);
    }
  }

  /**
   * Assert that no events were dispatched.
   */
  static assertNothingDispatched(): void {
    if (!this.fakeDispatcher) {
      throw new Error("Event facade has not been faked. Call Event.fake() first.");
    }

    const events = this.fakeDispatcher.getDispatchedEvents();

    if (events.length > 0) {
      const eventNames = [...new Set(events.map((e) => e.eventName))];
      throw new Error(
        `The following events were dispatched unexpectedly: [${eventNames.join(", ")}]`,
      );
    }
  }

  /**
   * Assert an event was dispatched a specific number of times.
   */
  static assertDispatchedTimes(event: string, times: number): void {
    this.assertDispatched(event, times);
  }

  /**
   * Get all dispatched events (for testing).
   */
  static dispatched(event?: string): DispatchedEvent[] {
    if (!this.fakeDispatcher) {
      throw new Error("Event facade has not been faked. Call Event.fake() first.");
    }

    if (event) {
      return this.fakeDispatcher.getDispatchedEventsFor(event);
    }

    return this.fakeDispatcher.getDispatchedEvents();
  }

  /**
   * Check if events are being faked.
   */
  static isFaking(): boolean {
    return this.fakeDispatcher !== null;
  }
}

// Export the facade
export const Event = EventFacadeClass;
export { EventFacadeClass };
