/*
|--------------------------------------------------------------------------
| Event System
|--------------------------------------------------------------------------
|
| A Laravel-like event dispatcher implementation.
| Supports synchronous and asynchronous event handling, event listeners,
| event subscribers, queueable listeners, and automatic discovery.
|
*/

export type EventListener<T = any> = (payload: T) => void | Promise<void>;

export interface EventSubscriber {
  /**
   * Register the listeners for the subscriber.
   */
  subscribe(dispatcher: EventDispatcher): void;
}

/**
 * Interface for listeners that should be queued.
 */
export interface ShouldQueueListener {
  shouldQueue?: boolean;
  connection?: string;
  queue?: string;
  delay?: number;
  tries?: number;
  timeout?: number;
  afterCommit?: boolean;
}

/**
 * Listener class metadata for registration.
 */
export interface ListenerRegistration {
  listener: EventListener;
  shouldQueue: boolean;
  queueConfig?: {
    connection?: string;
    queue?: string;
    delay?: number;
    tries?: number;
    timeout?: number;
  };
  listenerClass?: new () => any;
}

/*
|--------------------------------------------------------------------------
| Event Dispatcher
|--------------------------------------------------------------------------
*/

export class EventDispatcher {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private wildcardListeners: Map<string, Set<EventListener>> = new Map();
  private queuedListeners: Map<string, Set<ListenerRegistration>> = new Map();
  private listenerMetadata: Map<EventListener, ListenerRegistration> = new Map();
  private catchAllListeners: Set<EventListener> = new Set();

  /*
    |--------------------------------------------------------------------------
    | Registering Listeners
    |--------------------------------------------------------------------------
    */

  /**
   * Register an event listener.
   */
  listen(event: string | string[], listener: EventListener): this {
    const events = Array.isArray(event) ? event : [event];

    for (const evt of events) {
      if (evt.includes("*")) {
        // Wildcard listener
        if (!this.wildcardListeners.has(evt)) {
          this.wildcardListeners.set(evt, new Set());
        }
        this.wildcardListeners.get(evt)!.add(listener);
      } else {
        if (!this.listeners.has(evt)) {
          this.listeners.set(evt, new Set());
        }
        this.listeners.get(evt)!.add(listener);
      }
    }

    return this;
  }

  /**
   * Register an event listener that should be queued.
   */
  listenQueued(event: string | string[], listener: EventListener | ListenerRegistration): this {
    const events = Array.isArray(event) ? event : [event];

    // Normalize to ListenerRegistration
    const registration: ListenerRegistration =
      typeof listener === "function" ? { listener, shouldQueue: true } : listener;

    for (const evt of events) {
      if (!this.queuedListeners.has(evt)) {
        this.queuedListeners.set(evt, new Set());
      }
      this.queuedListeners.get(evt)!.add(registration);
      this.listenerMetadata.set(registration.listener, registration);
    }

    return this;
  }

  /**
   * Register a catch-all listener that receives all events.
   */
  catch(listener: EventListener): this {
    this.catchAllListeners.add(listener);
    return this;
  }

  /**
   * Register a listener that runs once.
   */
  once(event: string, listener: EventListener): this {
    const onceListener: EventListener = async (payload) => {
      this.forget(event, onceListener);
      await listener(payload);
    };
    return this.listen(event, onceListener);
  }

  /**
   * Register an event subscriber.
   */
  subscribe(subscriber: EventSubscriber | (new () => EventSubscriber)): this {
    const instance = typeof subscriber === "function" ? new subscriber() : subscriber;
    instance.subscribe(this);
    return this;
  }

  /*
    |--------------------------------------------------------------------------
    | Dispatching Events
    |--------------------------------------------------------------------------
    */

  /**
   * Dispatch an event and call the listeners.
   */
  async dispatch(event: string, payload?: any): Promise<void> {
    // Handle catch-all listeners first
    for (const listener of this.catchAllListeners) {
      try {
        await listener({ event, payload });
      } catch (err) {
        console.error(`[Event] Error in catch-all listener:`, err);
      }
    }

    // Regular listeners
    const listeners = this.getListeners(event);
    for (const listener of listeners) {
      await listener(payload);
    }

    // Queued listeners
    await this.dispatchQueuedListeners(event, payload);
  }

  /**
   * Dispatch queued listeners to the queue.
   */
  private async dispatchQueuedListeners(event: string, payload: any): Promise<void> {
    const queuedListeners = this.queuedListeners.get(event);
    if (!queuedListeners || queuedListeners.size === 0) return;

    // Dynamic import to avoid circular dependencies
    const { CallQueuedListener, registerQueuedListener } = await require("./QueuedEventJobs");
    const { Queue } = await import("@lara-node/queue");

    for (const registration of queuedListeners) {
      if (registration.listenerClass) {
        // Register the listener class in the registry for queue worker to find
        registerQueuedListener(registration.listenerClass.name, registration.listenerClass);

        // Create a job to call the listener
        const job = new CallQueuedListener(registration.listenerClass.name, event, payload);

        // Apply queue config
        if (registration.queueConfig) {
          if (registration.queueConfig.connection) {
            job.connection = registration.queueConfig.connection;
          }
          if (registration.queueConfig.queue) {
            job.queue = registration.queueConfig.queue;
          }
          if (registration.queueConfig.delay) {
            job.delay = registration.queueConfig.delay;
          }
          if (registration.queueConfig.tries) {
            job.tries = registration.queueConfig.tries;
          }
          if (registration.queueConfig.timeout) {
            job.timeout = registration.queueConfig.timeout;
          }
        }

        await Queue.push(job);
      } else {
        // Fallback: just call the listener (shouldn't normally happen)
        await registration.listener(payload);
      }
    }
  }

  /**
   * Dispatch an event synchronously.
   */
  dispatchSync(event: string, payload?: any): void {
    const listeners = this.getListeners(event);

    for (const listener of listeners) {
      const result = listener(payload);
      // If it returns a promise, we don't wait for it
      if (result instanceof Promise) {
        result.catch((err) => {
          console.error(`[Event] Error in listener for ${event}:`, err);
        });
      }
    }
  }

  /**
   * Fire an event (alias for dispatch).
   */
  async fire(event: string, payload?: any): Promise<void> {
    return this.dispatch(event, payload);
  }

  /**
   * Dispatch event without waiting for listeners.
   */
  dispatchNow(event: string, payload?: any): void {
    setImmediate(() => {
      this.dispatch(event, payload).catch((err) => {
        console.error(`[Event] Error dispatching ${event}:`, err);
      });
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Managing Listeners
    |--------------------------------------------------------------------------
    */

  /**
   * Get all listeners for an event.
   */
  getListeners(event: string): EventListener[] {
    const result: EventListener[] = [];

    // Regular listeners
    const regular = this.listeners.get(event);
    if (regular) {
      result.push(...regular);
    }

    // Wildcard listeners
    for (const [pattern, listeners] of this.wildcardListeners) {
      if (this.matchesWildcard(pattern, event)) {
        result.push(...listeners);
      }
    }

    return result;
  }

  /**
   * Check if there are listeners for an event.
   */
  hasListeners(event: string): boolean {
    if (this.listeners.has(event) && this.listeners.get(event)!.size > 0) {
      return true;
    }

    for (const [pattern] of this.wildcardListeners) {
      if (this.matchesWildcard(pattern, event)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Remove a listener.
   */
  forget(event: string, listener?: EventListener): this {
    if (!listener) {
      // Remove all listeners for this event
      this.listeners.delete(event);
      this.queuedListeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(listener);
      // For queued listeners, find and remove by listener function
      const queuedSet = this.queuedListeners.get(event);
      if (queuedSet) {
        for (const registration of queuedSet) {
          if (registration.listener === listener) {
            queuedSet.delete(registration);
            break;
          }
        }
      }
    }

    return this;
  }

  /**
   * Remove all listeners.
   */
  flush(): this {
    this.listeners.clear();
    this.wildcardListeners.clear();
    this.queuedListeners.clear();
    this.listenerMetadata.clear();
    this.catchAllListeners.clear();
    return this;
  }

  /**
   * Push a listener onto the listeners array.
   * Alias for listen() to match Laravel API.
   */
  push(event: string | string[], listener: EventListener): this {
    return this.listen(event, listener);
  }

  /**
   * Check if a specific listener is registered.
   */
  hasListener(event: string, listener: EventListener): boolean {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.has(listener) : false;
  }

  /**
   * Get the number of listeners for an event.
   */
  listenerCount(event: string): number {
    return this.getListeners(event).length;
  }

  /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

  private matchesWildcard(pattern: string, event: string): boolean {
    const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
    return regex.test(event);
  }
}

/*
|--------------------------------------------------------------------------
| Global Event Dispatcher Instance
|--------------------------------------------------------------------------
*/

let globalDispatcher: EventDispatcher | null = null;

export function getEventDispatcher(): EventDispatcher {
  if (!globalDispatcher) {
    globalDispatcher = new EventDispatcher();
  }
  return globalDispatcher;
}

export function setEventDispatcher(dispatcher: EventDispatcher): void {
  globalDispatcher = dispatcher;
}

/*
|--------------------------------------------------------------------------
| Event Helper Functions
|--------------------------------------------------------------------------
*/

/**
 * Dispatch an event.
 */
export async function event(eventName: string, payload?: any): Promise<void> {
  return getEventDispatcher().dispatch(eventName, payload);
}

/**
 * Listen for an event.
 */
export function on(eventName: string | string[], listener: EventListener): void {
  getEventDispatcher().listen(eventName, listener);
}

/**
 * Listen for an event once.
 */
export function once(eventName: string, listener: EventListener): void {
  getEventDispatcher().once(eventName, listener);
}

/**
 * Remove event listener(s).
 */
export function off(eventName: string, listener?: EventListener): void {
  getEventDispatcher().forget(eventName, listener);
}

/*
|--------------------------------------------------------------------------
| Event Base Class
|--------------------------------------------------------------------------
*/

export abstract class Event {
  /**
   * Queue configuration (set if event implements ShouldQueue).
   */
  public shouldQueue: boolean = false;
  public connection?: string;
  public queue?: string;
  public delaySeconds?: number;
  public name?: string;

  /**
   * The event name.
   */
  eventName(): string {
    return this.name || "unknown-event";
  }

  /**
   * Get the event payload.
   */
  toPayload(): Record<string, any> {
    return { ...this };
  }

  /**
   * Dispatch this event.
   */
  async dispatch(): Promise<void> {
    if (this.shouldQueue) {
      return this.dispatchToQueue();
    }
    return event(this.eventName(), this.toPayload());
  }

  /**
   * Dispatch this event to the queue.
   */
  async dispatchToQueue(): Promise<void> {
    const { CallQueuedEvent } = await require("./QueuedEventJobs");
    const { Queue } = await import("@lara-node/queue");

    const job = new CallQueuedEvent(this.constructor.name, this.eventName(), this.toPayload());

    if (this.connection) job.connection = this.connection;
    if (this.queue) job.queue = this.queue;
    if (this.delaySeconds) job.delay = this.delaySeconds;

    await Queue.push(job);
  }

  /**
   * Dispatch event synchronously.
   */
  dispatchSync(): void {
    getEventDispatcher().dispatchSync(this.eventName(), this.toPayload());
  }

  /**
   * Dispatch event without waiting.
   */
  dispatchNow(): void {
    getEventDispatcher().dispatchNow(this.eventName(), this.toPayload());
  }

  /**
   * Configure the event to be queued.
   */
  onQueue(queueName: string): this {
    this.shouldQueue = true;
    this.queue = queueName;
    return this;
  }

  /**
   * Configure the queue connection.
   */
  onConnection(connection: string): this {
    this.shouldQueue = true;
    this.connection = connection;
    return this;
  }

  /**
   * Configure the delay before processing.
   */
  withDelay(seconds: number): this {
    this.delaySeconds = seconds;
    return this;
  }

  /**
   * Alias for withDelay.
   */
  delay(seconds: number): this {
    return this.withDelay(seconds);
  }

  /**
   * Static dispatch helper.
   */
  static async dispatch(...args: any[]): Promise<void> {
    const instance = new (this as any)(...args);
    return instance.dispatch();
  }

  broadcastOn(): string[] {
    return [];
  }

  broadcastWith(): Record<string, any> {
    return {};
  }
}

/*
|--------------------------------------------------------------------------
| Listener Base Class
|--------------------------------------------------------------------------
*/

export abstract class Listener<T = any> implements ShouldQueueListener {
  /**
   * Whether the listener should be queued.
   */
  public shouldQueue: boolean = false;

  /**
   * Queue connection.
   */
  public connection?: string;

  /**
   * Queue name.
   */
  public queue?: string;

  /**
   * Delay in seconds.
   */
  public delay?: number;

  /**
   * Number of retry attempts.
   */
  public tries?: number;

  /**
   * Timeout in seconds.
   */
  public timeout?: number;

  /**
   * Whether to dispatch after database commit.
   */
  public afterCommit?: boolean;

  /**
   * Handle the event.
   */
  abstract handle(payload: T): void | Promise<void>;

  /**
   * Determine if the listener should handle the event.
   * Return false to skip handling.
   */
  shouldHandle(payload: T): boolean {
    return true;
  }

  /**
   * Handle a failed listener execution.
   */
  failed(payload: T, exception: Error): void {
    // Override in subclass to handle failures
  }

  /**
   * Get the middleware the listener should pass through.
   */
  middleware(): any[] {
    return [];
  }

  /**
   * Get the tags that should be assigned to the queued listener.
   */
  tags(): string[] {
    return [];
  }

  /**
   * Set the queue for this listener.
   */
  onQueue(queueName: string): this {
    this.shouldQueue = true;
    this.queue = queueName;
    return this;
  }

  /**
   * Set the connection for this listener.
   */
  onConnection(connection: string): this {
    this.shouldQueue = true;
    this.connection = connection;
    return this;
  }

  /**
   * Set the delay for this listener.
   */
  withDelay(seconds: number): this {
    this.delay = seconds;
    return this;
  }
}
