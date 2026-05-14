/*
|--------------------------------------------------------------------------
| Channel Classes
|--------------------------------------------------------------------------
|
| Laravel-like channel classes for defining broadcast channels.
| Supports public, private, and presence channels with authorization.
|
*/

import { ChannelType } from "./types.js";

/**
 * Base channel class.
 */
export abstract class Channel {
  /**
   * Channel name.
   */
  public readonly name: string;

  /**
   * Channel type.
   */
  public readonly type: ChannelType;

  constructor(name: string, type: ChannelType = ChannelType.PUBLIC) {
    this.name = name;
    this.type = type;
  }

  /**
   * Get the channel name.
   */
  toString(): string {
    return this.name;
  }
}

/**
 * Public channel - anyone can subscribe.
 */
export class PublicChannel extends Channel {
  constructor(name: string) {
    super(name, ChannelType.PUBLIC);
  }
}

/**
 * Private channel - requires authorization.
 */
export class PrivateChannel extends Channel {
  constructor(name: string) {
    // Prefix private channels with 'private-' if not already prefixed
    const channelName = name.startsWith("private-") ? name : `private-${name}`;
    super(channelName, ChannelType.PRIVATE);
  }
}

/**
 * Presence channel - requires authorization and tracks members.
 */
export class PresenceChannel extends Channel {
  constructor(name: string) {
    // Prefix presence channels with 'presence-' if not already prefixed
    const channelName = name.startsWith("presence-") ? name : `presence-${name}`;
    super(channelName, ChannelType.PRESENCE);
  }
}

/**
 * Channel authorization handler.
 * Returns boolean for private channels, or PresenceChannelResult | false for presence channels.
 */
export type ChannelAuthorizer = (
  user: any,
  ...params: string[]
) => boolean | PresenceChannelResult | false | Promise<boolean | PresenceChannelResult | false>;

/**
 * Presence channel authorization result.
 */
export interface PresenceChannelResult {
  /**
   * User ID.
   */
  id: string | number;

  /**
   * User info to share with other presence members.
   */
  [key: string]: any;
}

/**
 * Channel route definition.
 */
export interface ChannelRoute {
  /**
   * Channel name pattern (e.g., "orders.{orderId}").
   */
  name: string;

  /**
   * Channel type.
   */
  type: ChannelType;

  /**
   * Authorization callback.
   */
  authorizer: ChannelAuthorizer;
}

/**
 * Channel registry for storing channel definitions.
 */
class ChannelRegistry {
  private routes: ChannelRoute[] = [];

  /**
   * Register a public channel.
   */
  public(name: string): void {
    // Public channels don't need authorization
    this.routes.push({
      name,
      type: ChannelType.PUBLIC,
      authorizer: () => true,
    });
  }

  /**
   * Register a private channel.
   */
  private(name: string, authorizer: ChannelAuthorizer): void {
    const channelName = name.startsWith("private-") ? name : `private-${name}`;
    this.routes.push({
      name: channelName,
      type: ChannelType.PRIVATE,
      authorizer,
    });
  }

  /**
   * Register a presence channel.
   */
  presence(name: string, authorizer: ChannelAuthorizer): void {
    const channelName = name.startsWith("presence-") ? name : `presence-${name}`;
    this.routes.push({
      name: channelName,
      type: ChannelType.PRESENCE,
      authorizer,
    });
  }

  /**
   * Get all registered routes.
   */
  getRoutes(): ChannelRoute[] {
    return [...this.routes];
  }

  /**
   * Find a matching channel route.
   */
  findRoute(channelName: string): { route: ChannelRoute; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const params = this.matchChannel(route.name, channelName);
      if (params !== null) {
        return { route, params };
      }
    }
    return null;
  }

  /**
   * Match a channel name against a pattern.
   * Returns extracted parameters or null if no match.
   */
  private matchChannel(pattern: string, channelName: string): Record<string, string> | null {
    // Convert pattern like "orders.{orderId}" to regex
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/\{([^}]+)\}/g, (_, paramName) => {
      paramNames.push(paramName);
      return "([^.]+)";
    });

    const regex = new RegExp(`^${regexPattern}$`);
    const match = channelName.match(regex);

    if (!match) {
      return null;
    }

    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });

    return params;
  }

  /**
   * Clear all registered routes.
   */
  clear(): void {
    this.routes = [];
  }
}

// Singleton channel registry
export const channelRegistry = new ChannelRegistry();

/**
 * Define a broadcast channel.
 *
 * @example
 * // Public channel
 * Broadcast.channel('news');
 *
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
export function channel(name: string, authorizer?: ChannelAuthorizer): void {
  if (name.startsWith("presence-")) {
    channelRegistry.presence(name, authorizer || (() => true));
  } else if (name.startsWith("private-")) {
    channelRegistry.private(name, authorizer || (() => true));
  } else {
    channelRegistry.public(name);
  }
}

/**
 * Helper to create channel instances.
 */
export const Channels = {
  public: (name: string) => new PublicChannel(name),
  private: (name: string) => new PrivateChannel(name),
  presence: (name: string) => new PresenceChannel(name),
};
