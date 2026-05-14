/*
|--------------------------------------------------------------------------
| Broadcasting Types
|--------------------------------------------------------------------------
|
| Type definitions for the broadcasting/WebSocket system.
|
*/

import type { IncomingMessage } from "http";

/**
 * WebSocket connection with user context.
 */
export interface BroadcastConnection {
  /**
   * Unique connection ID.
   */
  id: string;

  /**
   * The WebSocket instance.
   */
  socket: WebSocketLike;

  /**
   * Channels this connection is subscribed to.
   */
  channels: Set<string>;

  /**
   * User ID if authenticated.
   */
  userId?: string | number;

  /**
   * User data if authenticated.
   */
  user?: Record<string, any>;

  /**
   * Connection timestamp.
   */
  connectedAt: Date;

  /**
   * Last activity timestamp.
   */
  lastActivityAt: Date;

  /**
   * Custom metadata.
   */
  metadata: Record<string, any>;
}

/**
 * WebSocket-like interface for compatibility.
 */
export interface WebSocketLike {
  send(data: string | Buffer): void;
  close(code?: number, reason?: string): void;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  readyState: number;
  OPEN: number;
  CLOSED: number;
}

/**
 * Channel types.
 */
export enum ChannelType {
  PUBLIC = "public",
  PRIVATE = "private",
  PRESENCE = "presence",
}

/**
 * Channel definition.
 */
export interface ChannelDefinition {
  /**
   * Channel name pattern (supports wildcards like "orders.{orderId}").
   */
  name: string;

  /**
   * Channel type.
   */
  type: ChannelType;

  /**
   * Authorization callback for private/presence channels.
   */
  authorize?: (
    user: any,
    channelName: string,
    params: Record<string, string>,
  ) => boolean | Promise<boolean>;

  /**
   * Get user info for presence channel.
   */
  presenceData?: (user: any, channelName: string) => Record<string, any>;
}

/**
 * Broadcast message payload.
 */
export interface BroadcastMessage {
  /**
   * The event name.
   */
  event: string;

  /**
   * The channel(s) to broadcast to.
   */
  channels: string[];

  /**
   * The event data.
   */
  data: Record<string, any>;

  /**
   * Socket ID to exclude from broadcast.
   */
  socket?: string;
}

/**
 * Client-to-server message types.
 */
export type ClientMessage =
  | { type: "subscribe"; channel: string }
  | { type: "unsubscribe"; channel: string }
  | { type: "ping" }
  | { type: "auth"; token: string }
  | { type: "whisper"; channel: string; event: string; data: any };

/**
 * Server-to-client message types.
 */
export type ServerMessage =
  | { type: "connected"; socketId: string }
  | { type: "subscribed"; channel: string }
  | { type: "unsubscribed"; channel: string }
  | { type: "error"; message: string; code?: string }
  | { type: "pong" }
  | { type: "event"; channel: string; event: string; data: any }
  | { type: "presence_subscribed"; channel: string; members: PresenceMember[] }
  | { type: "presence_member_added"; channel: string; member: PresenceMember }
  | { type: "presence_member_removed"; channel: string; member: PresenceMember };

/**
 * Presence channel member.
 */
export interface PresenceMember {
  /**
   * User ID.
   */
  id: string | number;

  /**
   * User info (name, avatar, etc.).
   */
  info: Record<string, any>;
}

/**
 * Broadcaster driver interface.
 */
export interface BroadcasterDriver {
  /**
   * Initialize the broadcaster.
   */
  initialize(): Promise<void>;

  /**
   * Broadcast a message to channels.
   */
  broadcast(message: BroadcastMessage): Promise<void>;

  /**
   * Get connections for a channel.
   */
  getChannelConnections(channel: string): BroadcastConnection[];

  /**
   * Get all active connections.
   */
  getAllConnections(): BroadcastConnection[];

  /**
   * Terminate a connection.
   */
  terminateConnection(connectionId: string): void;

  /**
   * Shutdown the broadcaster.
   */
  shutdown(): Promise<void>;

  /**
   *  Set Auth
   */
  setAuthenticator(authenticator: (token: string) => Promise<any>): void;
}

/**
 * Channel authorization request.
 */
export interface ChannelAuthRequest {
  socketId: string;
  channelName: string;
  token?: string;
}

/**
 * Channel authorization response.
 */
export interface ChannelAuthResponse {
  authorized: boolean;
  channelData?: {
    user_id: string | number;
    user_info?: Record<string, any>;
  };
}

/**
 * Event that implements ShouldBroadcast.
 */
export interface BroadcastableEvent {
  /**
   * Get the channels the event should broadcast on.
   * Can return channel names as strings or Channel objects.
   */
  broadcastOn(): string | string[] | { name: string } | { name: string }[];

  /**
   * The event's broadcast name.
   */
  broadcastAs?(): string;

  /**
   * Get the data to broadcast.
   */
  broadcastWith?(): Record<string, any>;

  /**
   * Determine if this event should be broadcast.
   */
  broadcastWhen?(): boolean;
}

/**
 * HTTP request for channel auth.
 */
export interface AuthHttpRequest {
  body: {
    socket_id: string;
    channel_name: string;
  };
  headers: Record<string, string | string[] | undefined>;
  user?: Record<string, any>;
}
