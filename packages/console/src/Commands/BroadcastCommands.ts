/*
|--------------------------------------------------------------------------
| Broadcasting Commands
|--------------------------------------------------------------------------
|
| Artisan commands for managing the broadcasting/WebSocket system.
|
*/
import { ArgumentsCamelCase } from "yargs";
import { Command } from "../Command.js";
import { getBroadcastManager, Broadcast, channelRegistry, ChannelRoute } from "@lara-node/events";

/*
|--------------------------------------------------------------------------
| broadcast:connections - List active WebSocket connections
|--------------------------------------------------------------------------
*/

export class BroadcastConnectionsCommand extends Command {
  protected signature = "broadcast:connections";
  protected description = "List active WebSocket connections";

  protected options = {
    channel: {
      type: "string" as const,
      alias: "c",
      description: "Filter by channel name",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const channel = args.channel as string | undefined;

    try {
      let connections;

      if (channel) {
        connections = await Broadcast.getChannelConnections(channel);
        this.info(`\nConnections on channel: ${channel}`);
      } else {
        connections = await Broadcast.getConnections();
        this.info(`\nAll active connections:`);
      }

      if (connections.length === 0) {
        this.warn("No active connections found.");
        return;
      }

      this.line("");
      this.table(
        ["ID", "User ID", "Channels", "Connected At", "Last Activity"],
        connections.map((conn) => [
          conn.id.substring(0, 8) + "...",
          String(conn.userId || "Guest"),
          conn.channels.size.toString(),
          conn.connectedAt.toISOString(),
          conn.lastActivityAt.toISOString(),
        ]),
      );

      this.info(`\nTotal: ${connections.length} connection(s)`);
    } catch (error: any) {
      this.error(`Failed to get connections: ${error.message}`);
    }
  }
}

/*
|--------------------------------------------------------------------------
| broadcast:channels - List registered broadcast channels
|--------------------------------------------------------------------------
*/

export class BroadcastChannelsCommand extends Command {
  protected signature = "broadcast:channels";
  protected description = "List registered broadcast channels";

  protected options = {
    type: {
      type: "string" as const,
      alias: "t",
      description: "Filter by channel type (public, private, presence)",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const typeFilter = args.type as string | undefined;

    try {
      // Load channel definitions
      try {
        await require("@/routes/channels");
      } catch (e) {
        // Channels file might not exist yet
      }

      let routes: ChannelRoute[] = channelRegistry.getRoutes();

      if (typeFilter) {
        routes = routes.filter((route: ChannelRoute) => route.type === typeFilter);
      }

      if (routes.length === 0) {
        this.warn("No channels registered.");
        return;
      }

      this.info("\nRegistered Broadcast Channels:");
      this.line("");

      this.table(
        ["Channel Pattern", "Type", "Has Authorization"],
        routes.map((route: ChannelRoute) => [
          route.name,
          route.type.toUpperCase(),
          route.authorizer !== undefined ? "Yes" : "No",
        ]),
      );

      this.info(`\nTotal: ${routes.length} channel(s)`);
    } catch (error: any) {
      this.error(`Failed to list channels: ${error.message}`);
    }
  }
}

/*
|--------------------------------------------------------------------------
| broadcast:terminate - Terminate a specific WebSocket connection
|--------------------------------------------------------------------------
*/

export class BroadcastTerminateCommand extends Command {
  protected signature = "broadcast:terminate <connection-id>";
  protected description = "Terminate a WebSocket connection by ID";

  protected arguments = {
    "connection-id": {
      type: "string" as const,
      description: "The connection ID to terminate",
      required: true,
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const connectionId = args["connection-id"] as string;

    try {
      const manager = getBroadcastManager();
      const wsDriver = manager.getWebSocketBroadcaster();

      if (!wsDriver) {
        this.error("WebSocket broadcaster not initialized.");
        return;
      }

      wsDriver.terminateConnection(connectionId);
      this.info(`Connection ${connectionId} terminated.`);
    } catch (error: any) {
      this.error(`Failed to terminate connection: ${error.message}`);
    }
  }
}

/*
|--------------------------------------------------------------------------
| broadcast:send - Send a broadcast message via CLI
|--------------------------------------------------------------------------
*/

export class BroadcastSendCommand extends Command {
  protected signature = "broadcast:send <event> <channels>";
  protected description = "Send a broadcast message to channels";

  protected arguments = {
    event: {
      type: "string" as const,
      description: "The event name to broadcast",
      required: true,
    },
    channels: {
      type: "string" as const,
      description: "Comma-separated list of channels",
      required: true,
    },
  };

  protected options = {
    data: {
      type: "string" as const,
      alias: "d",
      description: "JSON data to send with the event",
      default: "{}",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const event = args.event as string;
    const channelsStr = args.channels as string;
    const dataStr = args.data as string;

    try {
      const channels = channelsStr.split(",").map((c) => c.trim());
      const data = JSON.parse(dataStr);

      await Broadcast.event(event, channels, data);
      this.info(`\nBroadcast sent successfully!`);
      this.line(`  Event: ${event}`);
      this.line(`  Channels: ${channels.join(", ")}`);
      this.line(`  Data: ${JSON.stringify(data)}`);
    } catch (error: any) {
      this.error(`Failed to send broadcast: ${error.message}`);
    }
  }
}
