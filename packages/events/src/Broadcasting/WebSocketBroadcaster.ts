/*
|--------------------------------------------------------------------------
| WebSocket Broadcaster Driver
|--------------------------------------------------------------------------
|
| A native WebSocket broadcaster implementation using the built-in
| Node.js WebSocket support (ws package or native).
|
*/

import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import crypto from "crypto";
import {
  BroadcasterDriver,
  BroadcastConnection,
  BroadcastMessage,
  ClientMessage,
  ServerMessage,
  PresenceMember,
  ChannelType,
  WebSocketLike,
} from "./types.js";
import { channelRegistry, PresenceChannelResult } from "./Channel.js";

// Generate UUID using crypto
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * WebSocket broadcaster driver.
 */
export class WebSocketBroadcaster implements BroadcasterDriver {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, BroadcastConnection> = new Map();
  private channelMembers: Map<string, Map<string | number, PresenceMember>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private authenticateUser: ((token: string) => Promise<any>) | null = null;

  constructor(
    private options: {
      path?: string;
      pingInterval?: number;
      pingTimeout?: number;
      server?: HttpServer;
    } = {},
  ) {}

  /**
   * Set the user authentication function.
   */
  setAuthenticator(authenticator: (token: string) => Promise<any>): void {
    this.authenticateUser = authenticator;
  }

  /**
   * Initialize the WebSocket server.
   */
  async initialize(): Promise<void> {
    const wsOptions: any = {
      path: this.options.path || "/ws",
      clientTracking: false,
    };

    if (this.options.server) {
      wsOptions.server = this.options.server;
    } else {
      wsOptions.noServer = true;
    }

    this.wss = new WebSocketServer(wsOptions);

    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    // Set up ping interval
    if (this.options.pingInterval) {
      this.pingInterval = setInterval(() => {
        this.pingConnections();
      }, this.options.pingInterval);
    }

    console.log(`[Broadcasting] WebSocket server initialized on path: ${wsOptions.path}`);
  }

  /**
   * Handle a new WebSocket connection.
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const connectionId = generateId();

    const connection: BroadcastConnection = {
      id: connectionId,
      socket: ws as unknown as WebSocketLike,
      channels: new Set(),
      connectedAt: new Date(),
      lastActivityAt: new Date(),
      metadata: {
        ip: request.socket.remoteAddress,
        userAgent: request.headers["user-agent"],
      },
    };

    this.connections.set(connectionId, connection);

    // Send connection acknowledgment
    this.send(ws, {
      type: "connected",
      socketId: connectionId,
    });

    // Handle messages
    ws.on("message", async (data: Buffer | string) => {
      connection.lastActivityAt = new Date();
      await this.handleMessage(connection, data.toString());
    });

    // Handle close
    ws.on("close", () => {
      this.handleDisconnect(connection);
    });

    // Handle errors
    ws.on("error", (error: Error) => {
      console.error(`[Broadcasting] WebSocket error for ${connectionId}:`, error.message);
    });

    console.log(`[Broadcasting] New connection: ${connectionId}`);
  }

  /**
   * Handle incoming message from a connection.
   */
  private async handleMessage(connection: BroadcastConnection, data: string): Promise<void> {
    try {
      const message: ClientMessage = JSON.parse(data);

      switch (message.type) {
        case "ping":
          this.send(connection.socket, { type: "pong" });
          break;

        case "auth":
          await this.handleAuth(connection, message.token);
          break;

        case "subscribe":
          await this.handleSubscribe(connection, message.channel);
          break;

        case "unsubscribe":
          this.handleUnsubscribe(connection, message.channel);
          break;

        case "whisper":
          this.handleWhisper(connection, message.channel, message.event, message.data);
          break;
      }
    } catch (error) {
      console.error(`[Broadcasting] Error handling message:`, error);
      this.send(connection.socket, {
        type: "error",
        message: "Invalid message format",
        code: "INVALID_MESSAGE",
      });
    }
  }

  /**
   * Handle authentication request.
   */
  private async handleAuth(connection: BroadcastConnection, token: string): Promise<void> {
    if (!this.authenticateUser) {
      this.send(connection.socket, {
        type: "error",
        message: "Authentication not configured",
        code: "AUTH_NOT_CONFIGURED",
      });
      return;
    }

    try {
      const user = await this.authenticateUser(token);
      if (user) {
        connection.userId = user.id;
        connection.user = user;
        this.send(connection.socket, {
          type: "subscribed",
          channel: "__auth__",
        });
      } else {
        this.send(connection.socket, {
          type: "error",
          message: "Invalid token",
          code: "AUTH_FAILED",
        });
      }
    } catch (error) {
      this.send(connection.socket, {
        type: "error",
        message: "Authentication failed",
        code: "AUTH_ERROR",
      });
    }
  }

  /**
   * Handle channel subscription request.
   */
  private async handleSubscribe(
    connection: BroadcastConnection,
    channelName: string,
  ): Promise<void> {
    // Find the channel route
    const match = channelRegistry.findRoute(channelName);

    if (!match) {
      // Check if it's a public channel (no route needed)
      if (!channelName.startsWith("private-") && !channelName.startsWith("presence-")) {
        // Public channel - allow subscription
        connection.channels.add(channelName);
        this.send(connection.socket, { type: "subscribed", channel: channelName });
        return;
      }

      this.send(connection.socket, {
        type: "error",
        message: `Channel ${channelName} not found`,
        code: "CHANNEL_NOT_FOUND",
      });
      return;
    }

    const { route, params } = match;

    // Public channels don't require authorization
    if (route.type === ChannelType.PUBLIC) {
      connection.channels.add(channelName);
      this.send(connection.socket, { type: "subscribed", channel: channelName });
      return;
    }

    // Private and presence channels require authentication
    if (!connection.user) {
      this.send(connection.socket, {
        type: "error",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Authorize the user
    try {
      const paramValues = Object.values(params);
      const result = await route.authorizer(connection.user, ...paramValues);

      if (!result) {
        this.send(connection.socket, {
          type: "error",
          message: "Unauthorized",
          code: "UNAUTHORIZED",
        });
        return;
      }

      // Add to channel
      connection.channels.add(channelName);

      // Handle presence channels
      if (route.type === ChannelType.PRESENCE) {
        const presenceData =
          typeof result === "object"
            ? (result as PresenceChannelResult)
            : { id: connection.userId!, name: "User" };

        const member: PresenceMember = {
          id: presenceData.id,
          info: { ...presenceData },
        };
        delete (member.info as any).id;

        // Add member to presence channel
        if (!this.channelMembers.has(channelName)) {
          this.channelMembers.set(channelName, new Map());
        }
        this.channelMembers.get(channelName)!.set(presenceData.id, member);

        // Get current members
        const members = Array.from(this.channelMembers.get(channelName)!.values());

        // Send subscription confirmation with members
        this.send(connection.socket, {
          type: "presence_subscribed",
          channel: channelName,
          members,
        });

        // Notify other members
        this.broadcastToChannel(
          channelName,
          {
            type: "presence_member_added",
            channel: channelName,
            member,
          },
          connection.id,
        );
      } else {
        this.send(connection.socket, { type: "subscribed", channel: channelName });
      }
    } catch (error) {
      console.error(`[Broadcasting] Authorization error:`, error);
      this.send(connection.socket, {
        type: "error",
        message: "Authorization failed",
        code: "AUTH_ERROR",
      });
    }
  }

  /**
   * Handle channel unsubscription.
   */
  private handleUnsubscribe(connection: BroadcastConnection, channelName: string): void {
    if (!connection.channels.has(channelName)) {
      return;
    }

    connection.channels.delete(channelName);

    // Handle presence channel member removal
    if (channelName.startsWith("presence-") && connection.userId) {
      const members = this.channelMembers.get(channelName);
      if (members) {
        const member = members.get(connection.userId);
        if (member) {
          members.delete(connection.userId);

          // Notify other members
          this.broadcastToChannel(
            channelName,
            {
              type: "presence_member_removed",
              channel: channelName,
              member,
            },
            connection.id,
          );

          // Clean up empty presence channels
          if (members.size === 0) {
            this.channelMembers.delete(channelName);
          }
        }
      }
    }

    this.send(connection.socket, { type: "unsubscribed", channel: channelName });
  }

  /**
   * Handle whisper (client-to-client message).
   */
  private handleWhisper(
    connection: BroadcastConnection,
    channelName: string,
    event: string,
    data: any,
  ): void {
    if (!connection.channels.has(channelName)) {
      this.send(connection.socket, {
        type: "error",
        message: "Not subscribed to channel",
        code: "NOT_SUBSCRIBED",
      });
      return;
    }

    // Only allow whispers on private/presence channels
    if (!channelName.startsWith("private-") && !channelName.startsWith("presence-")) {
      this.send(connection.socket, {
        type: "error",
        message: "Whispers only allowed on private/presence channels",
        code: "WHISPER_NOT_ALLOWED",
      });
      return;
    }

    // Broadcast whisper to other channel members
    this.broadcastToChannel(
      channelName,
      {
        type: "event",
        channel: channelName,
        event: `client-${event}`,
        data,
      },
      connection.id,
    );
  }

  /**
   * Handle connection disconnect.
   */
  private handleDisconnect(connection: BroadcastConnection): void {
    // Remove from all presence channels
    for (const channelName of connection.channels) {
      if (channelName.startsWith("presence-") && connection.userId) {
        const members = this.channelMembers.get(channelName);
        if (members) {
          const member = members.get(connection.userId);
          if (member) {
            members.delete(connection.userId);

            // Notify other members
            this.broadcastToChannel(channelName, {
              type: "presence_member_removed",
              channel: channelName,
              member,
            });

            if (members.size === 0) {
              this.channelMembers.delete(channelName);
            }
          }
        }
      }
    }

    this.connections.delete(connection.id);
    console.log(`[Broadcasting] Connection closed: ${connection.id}`);
  }

  /**
   * Broadcast a message to all channels.
   */
  async broadcast(message: BroadcastMessage): Promise<void> {
    const serverMessage: ServerMessage = {
      type: "event",
      channel: message.channels[0],
      event: message.event,
      data: message.data,
    };

    for (const channelName of message.channels) {
      this.broadcastToChannel(
        channelName,
        { ...serverMessage, channel: channelName },
        message.socket,
      );
    }
  }

  /**
   * Broadcast to a specific channel.
   */
  private broadcastToChannel(
    channelName: string,
    message: ServerMessage,
    excludeSocket?: string,
  ): void {
    for (const [id, connection] of this.connections) {
      if (excludeSocket && id === excludeSocket) continue;
      if (!connection.channels.has(channelName)) continue;

      this.send(connection.socket, message);
    }
  }

  /**
   * Send a message to a WebSocket.
   */
  private send(socket: WebSocketLike | WebSocket, message: ServerMessage): void {
    try {
      const ws = socket as WebSocket;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error("[Broadcasting] Error sending message:", error);
    }
  }

  /**
   * Ping all connections.
   */
  private pingConnections(): void {
    const now = Date.now();
    const timeout = this.options.pingTimeout || 20000;

    for (const [id, connection] of this.connections) {
      const ws = connection.socket as unknown as WebSocket;

      // Check for stale connections
      if (now - connection.lastActivityAt.getTime() > timeout * 2) {
        console.log(`[Broadcasting] Terminating stale connection: ${id}`);
        ws.terminate?.();
        this.connections.delete(id);
        continue;
      }

      // Send ping
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping?.();
      }
    }
  }

  /**
   * Get connections for a channel.
   */
  getChannelConnections(channel: string): BroadcastConnection[] {
    const result: BroadcastConnection[] = [];
    for (const connection of this.connections.values()) {
      if (connection.channels.has(channel)) {
        result.push(connection);
      }
    }
    return result;
  }

  /**
   * Get all active connections.
   */
  getAllConnections(): BroadcastConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get presence channel members.
   */
  getPresenceMembers(channelName: string): PresenceMember[] {
    const members = this.channelMembers.get(channelName);
    return members ? Array.from(members.values()) : [];
  }

  /**
   * Terminate a specific connection.
   */
  terminateConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      (connection.socket as unknown as WebSocket).close(1000, "Connection terminated");
      this.handleDisconnect(connection);
    }
  }

  /**
   * Get the WebSocket server instance.
   */
  getServer(): WebSocketServer | null {
    return this.wss;
  }

  /**
   * Shutdown the broadcaster.
   */
  async shutdown(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      (connection.socket as unknown as WebSocket).close(1001, "Server shutting down");
    }

    this.connections.clear();
    this.channelMembers.clear();

    if (this.wss) {
      return new Promise((resolve) => {
        this.wss!.close(() => {
          console.log("[Broadcasting] WebSocket server shut down");
          resolve();
        });
      });
    }
  }
}
