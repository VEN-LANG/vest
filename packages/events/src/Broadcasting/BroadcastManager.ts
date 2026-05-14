/*
|--------------------------------------------------------------------------
| Broadcast Manager
|--------------------------------------------------------------------------
|
| The BroadcastManager handles broadcasting events to WebSocket clients.
| It supports multiple drivers and provides a Laravel-like API.
|
*/

import type { Server as HttpServer } from "http";
import {
  BroadcasterDriver,
  BroadcastMessage,
  BroadcastableEvent,
  BroadcastConnection,
} from "./types.js";
import { WebSocketBroadcaster } from "./WebSocketBroadcaster.js";
import { Channel } from "./Channel.js";
import broadcastingConfig from "./broadcasting.config.js";

/**
 * Log broadcaster driver - logs broadcasts instead of sending.
 */
class LogBroadcaster implements BroadcasterDriver {
  async initialize(): Promise<void> {
    console.log("[Broadcasting] Log broadcaster initialized");
  }

  async broadcast(message: BroadcastMessage): Promise<void> {
    console.log("[Broadcasting:Log]", JSON.stringify(message, null, 2));
  }

  getChannelConnections(): BroadcastConnection[] {
    return [];
  }

  getAllConnections(): BroadcastConnection[] {
    return [];
  }
  setAuthenticator(authenticator: (token: string) => Promise<any>): void {}

  terminateConnection(): void {}

  async shutdown(): Promise<void> {}
}

/**
 * Null broadcaster driver - does nothing.
 */
class NullBroadcaster implements BroadcasterDriver {
  async initialize(): Promise<void> {}
  async broadcast(): Promise<void> {}
  getChannelConnections(): BroadcastConnection[] {
    return [];
  }
  getAllConnections(): BroadcastConnection[] {
    return [];
  }
  setAuthenticator(authenticator: (token: string) => Promise<any>): void {}
  terminateConnection(): void {}
  async shutdown(): Promise<void> {}
}

/**
 * Pending broadcast helper for fluent API.
 */
export class PendingBroadcast {
  private channelNames: string[] = [];
  private excludeSocket: string | undefined;
  private eventData: Record<string, any> = {};

  constructor(private manager: BroadcastManager) {}

  /**
   * Set the channels to broadcast on.
   */
  on(channels: string | string[] | Channel | Channel[]): this {
    const channelList = Array.isArray(channels) ? channels : [channels];
    this.channelNames = channelList.map((c) => (c instanceof Channel ? c.name : c));
    return this;
  }

  /**
   * Alias for on().
   */
  to(channels: string | string[] | Channel | Channel[]): this {
    return this.on(channels);
  }

  /**
   * Set the data to broadcast.
   */
  with(data: Record<string, any>): this {
    this.eventData = { ...this.eventData, ...data };
    return this;
  }

  /**
   * Exclude a socket from receiving the broadcast.
   */
  except(socketId: string): this {
    this.excludeSocket = socketId;
    return this;
  }

  /**
   * Exclude a socket (alias).
   */
  toOthers(): this {
    // This is typically used with the current request's socket ID
    // In a real implementation, you'd get this from the request context
    return this;
  }

  /**
   * Send the broadcast.
   */
  async send(event: string, data?: Record<string, any>): Promise<void> {
    if (data) {
      this.eventData = { ...this.eventData, ...data };
    }

    if (this.channelNames.length === 0) {
      throw new Error("No channels specified for broadcast");
    }

    await this.manager.broadcast({
      event,
      channels: this.channelNames,
      data: this.eventData,
      socket: this.excludeSocket,
    });
  }

  /**
   * Alias for send().
   */
  async emit(event: string, data?: Record<string, any>): Promise<void> {
    return this.send(event, data);
  }
}

/**
 * Broadcast Manager - manages broadcaster drivers and provides API.
 */
export class BroadcastManager {
  private drivers: Map<string, BroadcasterDriver> = new Map();
  private defaultDriver: string;
  private initialized = false;
  private httpServer: HttpServer | null = null;

  constructor() {
    this.defaultDriver = broadcastingConfig.default;
  }

  /**
   * Set the HTTP server for WebSocket upgrade handling.
   */
  setHttpServer(server: HttpServer): void {
    this.httpServer = server;
  }

  /**
   * Initialize the broadcast manager.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize the default driver
    await this.driver(this.defaultDriver);
    this.initialized = true;

    console.log(`[Broadcasting] Manager initialized with driver: ${this.defaultDriver}`);
  }

  /**
   * Get or create a broadcaster driver.
   */
  async driver(name?: string): Promise<BroadcasterDriver> {
    const driverName = name || this.defaultDriver;

    if (this.drivers.has(driverName)) {
      return this.drivers.get(driverName)!;
    }

    const driver = await this.createDriver(driverName);
    this.drivers.set(driverName, driver);
    return driver;
  }

  setDriver(driver: BroadcasterDriver, name?: string): void {
    const driverName = name || this.defaultDriver;
    this.drivers.set(driverName, driver);
  }

  /**
   * Create a broadcaster driver instance.
   */
  private async createDriver(name: string): Promise<BroadcasterDriver> {
    const config = (broadcastingConfig.connections as any)[name];

    if (!config) {
      throw new Error(`Broadcast driver [${name}] is not configured`);
    }

    let driver: BroadcasterDriver;

    switch (config.driver) {
      case "websocket":
        driver = new WebSocketBroadcaster({
          path: config.path,
          pingInterval: config.pingInterval,
          pingTimeout: config.pingTimeout,
          server: this.httpServer || undefined,
        });
        break;

      case "log":
        driver = new LogBroadcaster();
        break;

      case "null":
        driver = new NullBroadcaster();
        break;

      default:
        throw new Error(`Unsupported broadcast driver: ${config.driver}`);
    }

    await driver.initialize();
    return driver;
  }

  /**
   * Broadcast a message directly.
   */
  async broadcast(message: BroadcastMessage): Promise<void> {
    const driver = await this.driver();
    await driver.broadcast(message);
  }

  /**
   * Convert a channel or channel name to string.
   */
  private toChannelName(channel: string | Channel | { name: string }): string {
    if (typeof channel === "string") {
      return channel;
    }
    return channel.name;
  }

  /**
   * Convert channels to array of channel names.
   */
  private toChannelNames(
    channels: string | string[] | Channel | Channel[] | { name: string } | { name: string }[],
  ): string[] {
    const channelList = Array.isArray(channels) ? channels : [channels];
    return channelList.map((c) => this.toChannelName(c as string | Channel | { name: string }));
  }

  /**
   * Broadcast an event to channels.
   */
  async event(
    event: string | BroadcastableEvent,
    channels?: string | string[] | Channel | Channel[],
    data?: Record<string, any>,
  ): Promise<void> {
    let eventName: string;
    let eventData: Record<string, any>;
    let eventChannels: string[];

    if (typeof event === "string") {
      eventName = event;
      eventData = data || {};
      eventChannels = channels ? this.toChannelNames(channels) : [];
    } else {
      // BroadcastableEvent object
      eventName = event.broadcastAs?.() || event.constructor.name;
      eventData = event.broadcastWith?.() || {};

      const broadcastChannels = event.broadcastOn();
      eventChannels = this.toChannelNames(broadcastChannels);

      // Check if should broadcast
      if (event.broadcastWhen && !event.broadcastWhen()) {
        return;
      }
    }

    if (eventChannels.length === 0) {
      throw new Error("No channels specified for broadcast");
    }

    await this.broadcast({
      event: eventName,
      channels: eventChannels,
      data: eventData,
    });
  }

  /**
   * Create a pending broadcast for fluent API.
   */
  to(channels: string | string[] | Channel | Channel[]): PendingBroadcast {
    return new PendingBroadcast(this).to(channels);
  }

  /**
   * Alias for to().
   */
  on(channels: string | string[] | Channel | Channel[]): PendingBroadcast {
    return new PendingBroadcast(this).on(channels);
  }

  /**
   * Get the WebSocket broadcaster if available.
   */
  getWebSocketBroadcaster(): WebSocketBroadcaster | null {
    const driver = this.drivers.get("websocket");
    return driver instanceof WebSocketBroadcaster ? driver : null;
  }

  /**
   * Get all connections (from default driver).
   */
  async getConnections(): Promise<BroadcastConnection[]> {
    const driver = await this.driver();
    return driver.getAllConnections();
  }

  /**
   * Get connections for a specific channel.
   */
  async getChannelConnections(channel: string): Promise<BroadcastConnection[]> {
    const driver = await this.driver();
    return driver.getChannelConnections(channel);
  }

  /**
   * Shutdown all drivers.
   */
  async shutdown(): Promise<void> {
    for (const driver of this.drivers.values()) {
      await driver.shutdown();
    }
    this.drivers.clear();
    this.initialized = false;
  }
}

// Singleton instance
let broadcastManagerInstance: BroadcastManager | null = null;

/**
 * Get the broadcast manager instance.
 */
export function getBroadcastManager(): BroadcastManager {
  if (!broadcastManagerInstance) {
    broadcastManagerInstance = new BroadcastManager();
  }
  return broadcastManagerInstance;
}

/**
 * Set the broadcast manager instance.
 */
export function setBroadcastManager(manager: BroadcastManager): void {
  broadcastManagerInstance = manager;
}

/**
 * Broadcast helper function.
 *
 * @example
 * // Broadcast to a channel
 * await broadcast('NewMessage', 'chat-room.1', { message: 'Hello!' });
 *
 * // Broadcast to multiple channels
 * await broadcast('OrderUpdated', ['orders.1', 'admin-dashboard'], { orderId: 1, status: 'shipped' });
 *
 * // Broadcast a BroadcastableEvent
 * await broadcast(new OrderShippedEvent(order));
 */
export async function broadcast(
  event: string | BroadcastableEvent,
  channels?: string | string[] | Channel | Channel[],
  data?: Record<string, any>,
): Promise<void> {
  const manager = getBroadcastManager();
  await manager.event(event, channels, data);
}
