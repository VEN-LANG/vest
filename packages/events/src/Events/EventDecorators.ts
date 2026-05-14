/*
|--------------------------------------------------------------------------
| Event Decorators
|--------------------------------------------------------------------------
|
| This provides Laravel-like decorators for event listeners and subscribers.
| These decorators enable automatic discovery and registration of listeners.
|
*/

import type { EventSubscriber } from "./EventDispatcher.js";

/*
|--------------------------------------------------------------------------
| Listener Metadata Storage
|--------------------------------------------------------------------------
*/

// Store listener metadata for auto-discovery
interface ListenerMetadata {
  events: string[];
  shouldQueue: boolean;
  queueConfig?: {
    connection?: string;
    queue?: string;
    delay?: number;
    tries?: number;
    timeout?: number;
  };
  afterCommit: boolean;
}

const listenerRegistry: Map<new () => any, ListenerMetadata> = new Map();
const subscriberRegistry: Set<new () => EventSubscriber> = new Set();
const eventClassRegistry: Map<string, new (...args: any[]) => any> = new Map();

/*
|--------------------------------------------------------------------------
| @ListensTo Decorator
|--------------------------------------------------------------------------
|
| Marks a listener class to automatically listen to specific events.
|
| @example
| @ListensTo('user.registered')
| class SendWelcomeEmail extends Listener<UserRegisteredPayload> {
|     handle(payload: UserRegisteredPayload) { ... }
| }
|
| @ListensTo(['user.created', 'user.updated'])
| class SyncUserToExternalService extends Listener { ... }
|
*/

export function ListensTo(events: string | string[]) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const eventList = Array.isArray(events) ? events : [events];

    const existing = listenerRegistry.get(constructor) || {
      events: [],
      shouldQueue: false,
      afterCommit: false,
    };

    existing.events = [...new Set([...existing.events, ...eventList])];
    listenerRegistry.set(constructor, existing);

    return constructor;
  };
}

/*
|--------------------------------------------------------------------------
| @ShouldQueue Decorator
|--------------------------------------------------------------------------
|
| Marks a listener to be processed on a queue.
|
| @example
| @ListensTo('user.registered')
| @ShouldQueue()
| class SendWelcomeEmail extends Listener { ... }
|
| @ListensTo('order.created')
| @ShouldQueue({ queue: 'notifications', delay: 60 })
| class NotifyWarehouse extends Listener { ... }
|
*/

export interface ShouldQueueOptions {
  connection?: string;
  queue?: string;
  delay?: number;
  tries?: number;
  timeout?: number;
}

export function ShouldQueue(options: ShouldQueueOptions = {}) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const existing = listenerRegistry.get(constructor) || {
      events: [],
      shouldQueue: false,
      afterCommit: false,
    };

    existing.shouldQueue = true;
    existing.queueConfig = options;
    listenerRegistry.set(constructor, existing);

    return constructor;
  };
}

/*
|--------------------------------------------------------------------------
| @AfterCommit Decorator
|--------------------------------------------------------------------------
|
| Marks a queued listener to only dispatch after database transaction commits.
|
| @example
| @ListensTo('order.created')
| @ShouldQueue()
| @AfterCommit()
| class ProcessPayment extends Listener { ... }
|
*/

export function AfterCommit() {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const existing = listenerRegistry.get(constructor) || {
      events: [],
      shouldQueue: false,
      afterCommit: false,
    };

    existing.afterCommit = true;
    listenerRegistry.set(constructor, existing);

    return constructor;
  };
}

/*
|--------------------------------------------------------------------------
| @Subscriber Decorator
|--------------------------------------------------------------------------
|
| Marks a class as an event subscriber for auto-discovery.
|
| @example
| @Subscriber()
| class UserEventSubscriber implements EventSubscriber {
|     subscribe(dispatcher: EventDispatcher) {
|         dispatcher.listen('user.registered', this.handleUserRegistered);
|         dispatcher.listen('user.deleted', this.handleUserDeleted);
|     }
| }
|
*/

export function Subscriber() {
  return function <T extends new (...args: any[]) => EventSubscriber>(constructor: T) {
    subscriberRegistry.add(constructor);
    return constructor;
  };
}

/*
|--------------------------------------------------------------------------
| @EventName Decorator
|--------------------------------------------------------------------------
|
| Sets a custom event name for an event class, used for auto-discovery.
|
| @example
| @EventName('user.registered')
| class UserRegistered extends Event { ... }
|
*/

export function EventName(name: string) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    eventClassRegistry.set(name, constructor);

    // Also set a static property on the class
    (constructor as any).eventName = name;

    return constructor;
  };
}

/*
|--------------------------------------------------------------------------
| Registry Access Functions
|--------------------------------------------------------------------------
*/

/**
 * Get all registered listeners with their metadata.
 */
export function getRegisteredListeners(): Map<new () => any, ListenerMetadata> {
  return listenerRegistry;
}

/**
 * Get all registered subscribers.
 */
export function getRegisteredSubscribers(): Set<new () => EventSubscriber> {
  return subscriberRegistry;
}

/**
 * Get all registered event classes.
 */
export function getRegisteredEventClasses(): Map<string, new (...args: any[]) => any> {
  return eventClassRegistry;
}

/**
 * Get listener metadata for a specific class.
 */
export function getListenerMetadata(listenerClass: new () => any): ListenerMetadata | undefined {
  return listenerRegistry.get(listenerClass);
}

/**
 * Check if a class is a registered listener.
 */
export function isRegisteredListener(listenerClass: new () => any): boolean {
  return listenerRegistry.has(listenerClass);
}

/**
 * Check if a class is a registered subscriber.
 */
export function isRegisteredSubscriber(subscriberClass: new () => EventSubscriber): boolean {
  return subscriberRegistry.has(subscriberClass);
}

/**
 * Clear all registries (useful for testing).
 */
export function clearEventRegistries(): void {
  listenerRegistry.clear();
  subscriberRegistry.clear();
  eventClassRegistry.clear();
}

/*
|--------------------------------------------------------------------------
| Listener Discovery Helper
|--------------------------------------------------------------------------
*/

/**
 * Get all listeners for a specific event.
 */
export function getListenersForEvent(eventName: string): Array<new () => any> {
  const listeners: Array<new () => any> = [];

  for (const [listenerClass, metadata] of listenerRegistry) {
    if (
      metadata.events.includes(eventName) ||
      metadata.events.some((e) => matchesWildcard(e, eventName))
    ) {
      listeners.push(listenerClass);
    }
  }

  return listeners;
}

/**
 * Check if a pattern matches an event name (supports wildcards).
 */
function matchesWildcard(pattern: string, event: string): boolean {
  if (!pattern.includes("*")) {
    return pattern === event;
  }

  const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
  return regex.test(event);
}
