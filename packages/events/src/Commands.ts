import { Command } from "@lara-node/console";
import { ArgumentsCamelCase } from "yargs";
import {
  getEventDispatcher,
  getRegisteredListeners,
  getRegisteredSubscribers,
  clearEventRegistries,
  Broadcast,
  channelRegistry,
  getBroadcastManager,
} from "./index.js";
import type { ChannelRoute } from "./index.js";

// ──────────────────────────────────────────────────────────────────────────────
// Event Commands
// ──────────────────────────────────────────────────────────────────────────────

export class EventListCommand extends Command {
  protected signature = "event:list";
  protected description = "List all registered events and listeners";

  protected options = {
    event: { type: "string" as const, description: "Filter by event name", alias: "e" },
    json: { type: "boolean" as const, description: "Output as JSON", default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const registeredListeners = getRegisteredListeners();
    const registeredSubscribers = getRegisteredSubscribers();

    const eventMap: Record<string, Array<{ listener: string; queued: boolean; queue?: string }>> = {};

    for (const [ListenerClass, metadata] of registeredListeners) {
      for (const eventName of metadata.events) {
        if (args.event && !eventName.includes(args.event as string)) continue;
        if (!eventMap[eventName]) eventMap[eventName] = [];
        eventMap[eventName].push({
          listener: ListenerClass.name,
          queued: metadata.shouldQueue,
          queue: metadata.queueConfig?.queue,
        });
      }
    }

    if (args.json) {
      this.line(JSON.stringify({ events: eventMap, subscriberCount: registeredSubscribers.size, subscribers: Array.from(registeredSubscribers).map((s) => s.name) }, null, 2));
      return;
    }

    const eventNames = Object.keys(eventMap).sort();

    if (eventNames.length === 0) {
      this.warn("No events registered.");
      this.comment("Tip: Use @ListensTo decorator on listener classes for auto-discovery.");
      return;
    }

    this.info(`Registered Events (${eventNames.length}):\n`);
    for (const eventName of eventNames) {
      this.line(`  \x1b[36m${eventName}\x1b[0m`);
      for (const listener of eventMap[eventName]) {
        const queueInfo = listener.queued ? ` \x1b[33m[queued${listener.queue ? `:${listener.queue}` : ""}]\x1b[0m` : "";
        this.line(`    → ${listener.listener}${queueInfo}`);
      }
      this.newLine();
    }

    if (registeredSubscribers.size > 0) {
      this.info(`Registered Subscribers (${registeredSubscribers.size}):\n`);
      for (const Subscriber of registeredSubscribers) this.line(`  → ${Subscriber.name}`);
      this.newLine();
    }
  }
}

export class EventDispatchCommand extends Command {
  protected signature = "event:dispatch <event>";
  protected description = "Dispatch an event manually";

  protected arguments = {
    event: { type: "string" as const, description: "Event name to dispatch", required: true },
  };

  protected options = {
    payload: { type: "string" as const, description: "JSON payload for the event", alias: "p" },
    sync: { type: "boolean" as const, description: "Dispatch synchronously", default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const eventName = args.event as string;
    let payload: Record<string, unknown> = {};

    if (args.payload) {
      try {
        payload = JSON.parse(args.payload as string);
      } catch {
        this.error("Invalid JSON payload.");
        return;
      }
    }

    this.info(`Dispatching event: ${eventName}`);
    this.comment(`Payload: ${JSON.stringify(payload)}`);
    this.newLine();

    try {
      const dispatcher = getEventDispatcher();
      if (args.sync) {
        dispatcher.dispatchSync(eventName, payload);
      } else {
        await dispatcher.dispatch(eventName, payload);
      }
      this.success(`Event "${eventName}" dispatched successfully.`);
    } catch (error: unknown) {
      this.error(`Failed to dispatch event: ${(error as Error).message}`);
    }
  }
}

export class EventClearCommand extends Command {
  protected signature = "event:clear";
  protected description = "Clear all registered event listeners";

  protected options = {
    event: { type: "string" as const, description: "Clear listeners for a specific event", alias: "e" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const dispatcher = getEventDispatcher();

    if (args.event) {
      dispatcher.forget(args.event as string);
      this.success(`Listeners for "${args.event}" cleared.`);
    } else {
      const confirmed = await this.confirm("Are you sure you want to clear ALL event listeners?");
      if (!confirmed) { this.warn("Operation cancelled."); return; }
      dispatcher.flush();
      clearEventRegistries();
      this.success("All event listeners cleared.");
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Broadcast Commands
// ──────────────────────────────────────────────────────────────────────────────

export class BroadcastConnectionsCommand extends Command {
  protected signature = "broadcast:connections";
  protected description = "List active WebSocket connections";

  protected options = {
    channel: { type: "string" as const, alias: "c", description: "Filter by channel name" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const channel = args.channel as string | undefined;

    try {
      const connections = channel
        ? await Broadcast.getChannelConnections(channel)
        : await Broadcast.getConnections();

      this.info(channel ? `\nConnections on channel: ${channel}` : "\nAll active connections:");

      if (connections.length === 0) { this.warn("No active connections found."); return; }

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
    } catch (error: unknown) {
      this.error(`Failed to get connections: ${(error as Error).message}`);
    }
  }
}

export class BroadcastChannelsCommand extends Command {
  protected signature = "broadcast:channels";
  protected description = "List registered broadcast channels";

  protected options = {
    type: { type: "string" as const, alias: "t", description: "Filter by channel type (public, private, presence)" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const typeFilter = args.type as string | undefined;

    try {
      let routes: ChannelRoute[] = channelRegistry.getRoutes();
      if (typeFilter) routes = routes.filter((r: ChannelRoute) => r.type === typeFilter);

      if (routes.length === 0) { this.warn("No channels registered."); return; }

      this.info("\nRegistered Broadcast Channels:\n");
      this.table(
        ["Channel Pattern", "Type", "Has Authorization"],
        routes.map((r: ChannelRoute) => [r.name, r.type.toUpperCase(), r.authorizer !== undefined ? "Yes" : "No"]),
      );
      this.info(`\nTotal: ${routes.length} channel(s)`);
    } catch (error: unknown) {
      this.error(`Failed to list channels: ${(error as Error).message}`);
    }
  }
}

export class BroadcastTerminateCommand extends Command {
  protected signature = "broadcast:terminate <connection-id>";
  protected description = "Terminate a WebSocket connection by ID";

  protected arguments = {
    "connection-id": { type: "string" as const, description: "The connection ID to terminate", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    try {
      const manager = getBroadcastManager();
      const wsDriver = manager.getWebSocketBroadcaster();

      if (!wsDriver) { this.error("WebSocket broadcaster not initialized."); return; }

      wsDriver.terminateConnection(args["connection-id"] as string);
      this.info(`Connection ${args["connection-id"]} terminated.`);
    } catch (error: unknown) {
      this.error(`Failed to terminate connection: ${(error as Error).message}`);
    }
  }
}

export class BroadcastSendCommand extends Command {
  protected signature = "broadcast:send <event> <channels>";
  protected description = "Send a broadcast message to channels";

  protected arguments = {
    event: { type: "string" as const, description: "The event name to broadcast", required: true },
    channels: { type: "string" as const, description: "Comma-separated list of channels", required: true },
  };

  protected options = {
    data: { type: "string" as const, alias: "d", description: "JSON data to send with the event", default: "{}" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    try {
      const channels = (args.channels as string).split(",").map((c) => c.trim());
      const data = JSON.parse(args.data as string);

      await Broadcast.event(args.event as string, channels, data);
      this.info("\nBroadcast sent successfully!");
      this.line(`  Event: ${args.event}`);
      this.line(`  Channels: ${channels.join(", ")}`);
      this.line(`  Data: ${JSON.stringify(data)}`);
    } catch (error: unknown) {
      this.error(`Failed to send broadcast: ${(error as Error).message}`);
    }
  }
}
