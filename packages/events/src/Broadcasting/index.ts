/*
|--------------------------------------------------------------------------
| Broadcasting Module Exports
|--------------------------------------------------------------------------
|
| Export all broadcasting-related classes and utilities.
|
*/

// Types
export * from "./types.js";

// Channel classes
export {
  Channel,
  PublicChannel,
  PrivateChannel,
  PresenceChannel,
  channelRegistry,
  channel,
  Channels,
  ChannelAuthorizer,
  PresenceChannelResult,
  ChannelRoute,
} from "./Channel.js";

// Broadcast Manager
export {
  BroadcastManager,
  PendingBroadcast,
  getBroadcastManager,
  setBroadcastManager,
  broadcast,
} from "./BroadcastManager.js";

// Broadcast Facade
export { Broadcast, Broadcast as default } from "./BroadcastFacade.js";

// WebSocket Broadcaster
export { WebSocketBroadcaster } from "./WebSocketBroadcaster.js";

// Decorators
export {
  ShouldBroadcast,
  BroadcastAs,
  BroadcastWhen,
  BroadcastWith,
  BroadcastToOthers,
  isBroadcastable,
  shouldBroadcastToOthers,
} from "./BroadcastDecorators.js";
