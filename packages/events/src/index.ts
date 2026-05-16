import { setConfig } from "@lara-node/core";
import _broadcastingConfig from "./Broadcasting/broadcasting.config.js";
setConfig("broadcasting", _broadcastingConfig as unknown as Record<string, unknown>);
export { default as broadcastingConfig } from "./Broadcasting/broadcasting.config.js";
export type { BroadcastingConfig } from "./Broadcasting/broadcasting.config.js";

// Events
export {
  EventDispatcher,
  getEventDispatcher,
  setEventDispatcher,
  event,
  on,
  once,
  off,
  Event,
  Listener,
} from "./Events/EventDispatcher.js";
export type {
  EventListener,
  EventSubscriber,
  ShouldQueueListener,
  ListenerRegistration,
} from "./Events/EventDispatcher.js";
export {
  FakeEventDispatcher,
  EventFacadeClass,
  QueueableListener,
  queueable,
} from "./Events/EventFacade.js";
export type { DispatchedEvent } from "./Events/EventFacade.js";
export {
  ListensTo,
  ShouldQueue,
  ShouldQueue as ShouldQueueDecorator,
  AfterCommit,
  Subscriber,
  EventName,
  getRegisteredListeners,
  getRegisteredSubscribers,
  getRegisteredEventClasses,
  getListenerMetadata,
  isRegisteredListener,
  isRegisteredSubscriber,
  clearEventRegistries,
  getListenersForEvent,
} from "./Events/EventDecorators.js";
export {
  CallQueuedListener,
  CallQueuedEvent,
  registerQueuedListener,
  getQueuedListener,
  hasQueuedListener,
} from "./Events/QueuedEventJobs.js";

// Broadcasting
export {
  BroadcastManager,
  getBroadcastManager,
  setBroadcastManager,
  broadcast,
} from "./Broadcasting/BroadcastManager.js";
export { Broadcast } from "./Broadcasting/BroadcastFacade.js";
export {
  Channel,
  PublicChannel,
  PrivateChannel,
  PresenceChannel,
  channelRegistry,
} from "./Broadcasting/Channel.js";
export type { ChannelRoute } from "./Broadcasting/Channel.js";
export {
  ShouldBroadcast,
  ShouldBroadcast as BroadcastOn,
  BroadcastAs,
  BroadcastWith,
  BroadcastToOthers,
  BroadcastWhen,
} from "./Broadcasting/BroadcastDecorators.js";
export type {
  BroadcastableEvent,
  BroadcasterDriver,
  BroadcastConnection,
  BroadcastMessage,
  ChannelType,
} from "./Broadcasting/types.js";

// Service Providers
export { EventServiceProvider } from "./EventServiceProvider.js";
export { BroadcastServiceProvider } from "./BroadcastServiceProvider.js";
