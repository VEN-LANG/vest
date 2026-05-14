/*
|--------------------------------------------------------------------------
| Broadcast Facade
|--------------------------------------------------------------------------
|
| A Laravel-like facade for broadcasting events to WebSocket channels.
| Provides a clean, static API for common broadcasting operations.
|
*/

import {
  getBroadcastManager,
  BroadcastManager,
  PendingBroadcast,
  broadcast as broadcastHelper,
} from "./BroadcastManager.js";
import {
  Channel,
  PublicChannel,
  PrivateChannel,
  PresenceChannel,
  channelRegistry,
  channel as defineChannel,
  ChannelAuthorizer,
} from "./Channel.js";
import { BroadcastableEvent, BroadcastConnection } from "./types.js";

/**
 * Broadcast Facade - static methods for broadcasting.
 *
 * @example
 * // Simple broadcast
 * await Broadcast.event('NewMessage', 'chat-room.1', { message: 'Hello!' });
 *
 * // Fluent API
 * await Broadcast.to('chat-room.1').send('NewMessage', { message: 'Hello!' });
 *
 * // Define channels
 * Broadcast.channel('private-orders.{orderId}', (user, orderId) => {
 *     return user.orders.includes(orderId);
 * });
 */
export class Broadcast {
  /*
    |--------------------------------------------------------------------------
    | Broadcasting Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Broadcast an event to channels.
   */
  static async event(
    event: string | BroadcastableEvent,
    channels?: string | string[] | Channel | Channel[],
    data?: Record<string, any>,
  ): Promise<void> {
    return broadcastHelper(event, channels, data);
  }

  /**
   * Broadcast an event (alias for event()).
   */
  static async send(
    event: string,
    channels: string | string[] | Channel | Channel[],
    data?: Record<string, any>,
  ): Promise<void> {
    return this.event(event, channels, data);
  }

  /**
   * Create a pending broadcast with fluent API.
   */
  static to(channels: string | string[] | Channel | Channel[]): PendingBroadcast {
    return getBroadcastManager().to(channels);
  }

  /**
   * Alias for to().
   */
  static on(channels: string | string[] | Channel | Channel[]): PendingBroadcast {
    return getBroadcastManager().on(channels);
  }

  /*
    |--------------------------------------------------------------------------
    | Channel Definition Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Define a broadcast channel with authorization.
   *
   * @example
   * // Private channel
   * Broadcast.channel('private-orders.{orderId}', (user, orderId) => {
   *     return user.orders.includes(orderId);
   * });
   *
   * // Presence channel
   * Broadcast.channel('presence-chat.{roomId}', (user, roomId) => {
   *     return { id: user.id, name: user.name };
   * });
   */
  static channel(name: string, authorizer?: ChannelAuthorizer): void {
    defineChannel(name, authorizer);
  }

  /**
   * Define a private channel.
   */
  static private(name: string, authorizer: ChannelAuthorizer): void {
    channelRegistry.private(name, authorizer);
  }

  /**
   * Define a presence channel.
   */
  static presence(name: string, authorizer: ChannelAuthorizer): void {
    channelRegistry.presence(name, authorizer);
  }

  /**
   * Define a public channel.
   */
  static public(name: string): void {
    channelRegistry.public(name);
  }

  /*
    |--------------------------------------------------------------------------
    | Channel Helpers
    |--------------------------------------------------------------------------
    */

  /**
   * Create a public channel instance.
   */
  static publicChannel(name: string): PublicChannel {
    return new PublicChannel(name);
  }

  /**
   * Create a private channel instance.
   */
  static privateChannel(name: string): PrivateChannel {
    return new PrivateChannel(name);
  }

  /**
   * Create a presence channel instance.
   */
  static presenceChannel(name: string): PresenceChannel {
    return new PresenceChannel(name);
  }

  /*
    |--------------------------------------------------------------------------
    | Manager Access
    |--------------------------------------------------------------------------
    */

  /**
   * Get the broadcast manager instance.
   */
  static manager(): BroadcastManager {
    return getBroadcastManager();
  }

  /**
   * Initialize the broadcast manager.
   */
  static async initialize(): Promise<void> {
    return getBroadcastManager().initialize();
  }

  /**
   * Shutdown broadcasting.
   */
  static async shutdown(): Promise<void> {
    return getBroadcastManager().shutdown();
  }

  /**
   * Get all active connections.
   */
  static async getConnections(): Promise<BroadcastConnection[]> {
    return getBroadcastManager().getConnections();
  }

  /**
   * Get connections for a specific channel.
   */
  static async getChannelConnections(channel: string): Promise<BroadcastConnection[]> {
    return getBroadcastManager().getChannelConnections(channel);
  }
}

export default Broadcast;
