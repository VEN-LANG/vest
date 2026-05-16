/*
|--------------------------------------------------------------------------
| Call Queued Listener Job
|--------------------------------------------------------------------------
|
| This job is used to dispatch listener execution on the queue.
| When a listener is marked with @ShouldQueue, it will be wrapped
| in this job and dispatched to the queue.
|
*/

import { Job, Queueable } from "@lara-node/queue";

/*
|--------------------------------------------------------------------------
| Listener Registry
|--------------------------------------------------------------------------
|
| A registry to store listener classes by name for queue deserialization.
| Listeners must be registered here to be callable from the queue.
|
*/

const listenerRegistry: Map<string, new () => any> = new Map();

/**
 * Register a listener class for queue execution.
 */
export function registerQueuedListener(name: string, listenerClass: new () => any): void {
  listenerRegistry.set(name, listenerClass);
}

/**
 * Get a registered listener class by name.
 */
export function getQueuedListener(name: string): (new () => any) | undefined {
  return listenerRegistry.get(name);
}

/**
 * Check if a listener is registered.
 */
export function hasQueuedListener(name: string): boolean {
  return listenerRegistry.has(name);
}

/**
 * Get all registered listener names.
 */
export function getRegisteredListenerNames(): string[] {
  return Array.from(listenerRegistry.keys());
}

@Queueable("CallQueuedListener")
export class CallQueuedListener extends Job {
  /**
   * The listener class name.
   */
  public listenerClass: string = "";

  /**
   * The event name.
   */
  public eventName: string = "";

  /**
   * The event payload.
   */
  public payload: any = null;

  constructor(listenerClass?: string, eventName?: string, payload?: any) {
    super();
    if (listenerClass) this.listenerClass = listenerClass;
    if (eventName) this.eventName = eventName;
    if (payload !== undefined) this.payload = payload;
  }

  /**
   * Execute the job.
   */
  async handle(): Promise<void> {
    try {
      // Get the listener from the registry
      let ListenerClass = getQueuedListener(this.listenerClass);

      if (!ListenerClass) {
        // Try to auto-discover by importing app listeners
        await this.discoverListeners();
        ListenerClass = getQueuedListener(this.listenerClass);

        if (!ListenerClass) {
          throw new Error(
            `Listener class [${this.listenerClass}] not found in registry. ` +
              `Make sure listeners are registered via EventServiceProvider.discoverListeners() and uses @ShouldQueue decorator.`,
          );
        }
      }

      await this.executeListener(ListenerClass);
    } catch (error) {
      console.error(`[CallQueuedListener] Failed to execute ${this.listenerClass}:`, error);
      throw error;
    }
  }

  /**
   * Execute a listener class with the payload.
   */
  private async executeListener(ListenerClass: new () => any): Promise<void> {
    const listener = new ListenerClass();

    if (typeof listener.handle !== "function") {
      throw new Error(`Listener [${this.listenerClass}] does not have a handle method`);
    }

    // Check shouldHandle if it exists
    if (typeof listener.shouldHandle === "function" && !listener.shouldHandle(this.payload)) {
      console.log(
        `[CallQueuedListener] Listener ${this.listenerClass} skipped (shouldHandle returned false)`,
      );
      return;
    }

    await listener.handle(this.payload);
    console.log(
      `[CallQueuedListener] Successfully executed ${this.listenerClass} for event ${this.eventName}`,
    );
  }

  /**
   * Try to discover listeners by importing the app listeners module.
   */
  private async discoverListeners(): Promise<void> {
    // Listeners are discovered by EventServiceProvider.discoverListeners() at boot time
  }

  /**
   * Handle a job failure.
   */
  failed(exception: Error): void {
    console.error(
      `[CallQueuedListener] Listener ${this.listenerClass} failed for event ${this.eventName}:`,
      exception.message,
    );
  }

  /**
   * Get the display name of the job.
   */
  displayName(): string {
    return `${this.listenerClass}@handle`;
  }

  /**
   * Get the tags that should be assigned to the job.
   */
  tags(): string[] {
    return [`event:${this.eventName}`, `listener:${this.listenerClass}`];
  }
}

/*
|--------------------------------------------------------------------------
| Call Queued Event Job
|--------------------------------------------------------------------------
|
| This job is used to dispatch event classes that implement ShouldQueue.
| The event itself is serialized and processed asynchronously.
|
*/

@Queueable("CallQueuedEvent")
export class CallQueuedEvent extends Job {
  /**
   * The event class name.
   */
  public eventClass: string = "";

  /**
   * The serialized event payload.
   */
  public eventPayload: Record<string, any> = {};

  /**
   * The event name.
   */
  public eventName: string = "";

  constructor(eventClass?: string, eventName?: string, eventPayload?: Record<string, any>) {
    super();
    if (eventClass) this.eventClass = eventClass;
    if (eventName) this.eventName = eventName;
    if (eventPayload) this.eventPayload = eventPayload;
  }

  /**
   * Execute the job - dispatch the event to its listeners.
   */
  async handle(): Promise<void> {
    const { getEventDispatcher } = await import("../index.js");
    const dispatcher = getEventDispatcher();

    // Dispatch the event to all its listeners
    await dispatcher.dispatch(this.eventName, this.eventPayload);

    console.log(`[CallQueuedEvent] Dispatched queued event ${this.eventClass}`);
  }

  /**
   * Handle a job failure.
   */
  failed(exception: Error): void {
    console.error(
      `[CallQueuedEvent] Failed to dispatch event ${this.eventClass}:`,
      exception.message,
    );
  }

  /**
   * Get the display name of the job.
   */
  displayName(): string {
    return this.eventClass;
  }

  /**
   * Get the tags that should be assigned to the job.
   */
  tags(): string[] {
    return [`event:${this.eventName}`];
  }
}
