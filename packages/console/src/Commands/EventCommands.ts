import { Command } from "../Command.js";
import { ArgumentsCamelCase } from "yargs";
import {
  getEventDispatcher,
  getRegisteredListeners,
  getRegisteredSubscribers,
  clearEventRegistries,
} from "@lara-node/events";

/*
|--------------------------------------------------------------------------
| Event List Command
|--------------------------------------------------------------------------
|
| Lists all registered events and their listeners.
|
*/

export class EventListCommand extends Command {
  protected signature = "event:list";
  protected description = "List all registered events and listeners";

  protected options = {
    event: { type: "string" as const, description: "Filter by event name", alias: "e" },
    json: { type: "boolean" as const, description: "Output as JSON", default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    // Import listeners/subscribers to trigger decorator registration
    try {
      Promise.resolve();
    } catch (e) {
      /* ignore */
    }
    try {
      Promise.resolve();
    } catch (e) {
      /* ignore */
    }

    const dispatcher = getEventDispatcher();
    const registeredListeners = getRegisteredListeners();
    const registeredSubscribers = getRegisteredSubscribers();

    // Build event-listener map
    const eventMap: Record<
      string,
      Array<{ listener: string; queued: boolean; queue?: string }>
    > = {};

    // From decorator registry
    for (const [ListenerClass, metadata] of registeredListeners) {
      for (const eventName of metadata.events) {
        if (args.event && !eventName.includes(args.event as string)) continue;

        if (!eventMap[eventName]) {
          eventMap[eventName] = [];
        }
        eventMap[eventName].push({
          listener: ListenerClass.name,
          queued: metadata.shouldQueue,
          queue: metadata.queueConfig?.queue,
        });
      }
    }

    if (args.json) {
      this.line(
        JSON.stringify(
          {
            events: eventMap,
            subscriberCount: registeredSubscribers.size,
            subscribers: Array.from(registeredSubscribers).map((s) => s.name),
          },
          null,
          2,
        ),
      );
      return;
    }

    const eventNames = Object.keys(eventMap).sort();

    if (eventNames.length === 0) {
      this.warn("No events registered.");
      this.newLine();
      this.comment("Tip: Use @ListensTo decorator on listener classes for auto-discovery.");
      return;
    }

    this.info(`Registered Events (${eventNames.length}):\n`);

    for (const eventName of eventNames) {
      this.line(`  \x1b[36m${eventName}\x1b[0m`);
      for (const listener of eventMap[eventName]) {
        const queueInfo = listener.queued
          ? ` \x1b[33m[queued${listener.queue ? `:${listener.queue}` : ""}]\x1b[0m`
          : "";
        this.line(`    → ${listener.listener}${queueInfo}`);
      }
      this.newLine();
    }

    // Show subscribers
    if (registeredSubscribers.size > 0) {
      this.info(`Registered Subscribers (${registeredSubscribers.size}):\n`);
      for (const Subscriber of registeredSubscribers) {
        this.line(`  → ${Subscriber.name}`);
      }
      this.newLine();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Event Dispatch Command
|--------------------------------------------------------------------------
|
| Manually dispatch an event from the command line.
|
*/

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
    const { event: eventFn, getEventDispatcher } = await import("@lara-node/events");

    const eventName = args.event as string;
    let payload: any = {};

    if (args.payload) {
      try {
        payload = JSON.parse(args.payload as string);
      } catch (e) {
        this.error("Invalid JSON payload.");
        return;
      }
    }

    this.info(`Dispatching event: ${eventName}`);
    this.comment(`Payload: ${JSON.stringify(payload)}`);
    this.newLine();

    try {
      if (args.sync) {
        getEventDispatcher().dispatchSync(eventName, payload);
      } else {
        await eventFn(eventName, payload);
      }
      this.success(`Event "${eventName}" dispatched successfully.`);
    } catch (error: any) {
      this.error(`Failed to dispatch event: ${error.message}`);
    }
  }
}

/*
|--------------------------------------------------------------------------
| Event Clear Command
|--------------------------------------------------------------------------
|
| Clear all event listeners.
|
*/

export class EventClearCommand extends Command {
  protected signature = "event:clear";
  protected description = "Clear all registered event listeners";

  protected options = {
    event: {
      type: "string" as const,
      description: "Clear listeners for a specific event",
      alias: "e",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const { getEventDispatcher } = await import("@lara-node/events");
    const dispatcher = getEventDispatcher();

    if (args.event) {
      dispatcher.forget(args.event as string);
      this.success(`Listeners for "${args.event}" cleared.`);
    } else {
      const confirmed = await this.confirm("Are you sure you want to clear ALL event listeners?");
      if (!confirmed) {
        this.warn("Operation cancelled.");
        return;
      }
      dispatcher.flush();
      clearEventRegistries();
      this.success("All event listeners cleared.");
    }
  }
}

/*
|--------------------------------------------------------------------------
| Event Generate Command
|--------------------------------------------------------------------------
|
| Generate a new event class.
|
*/

export class EventGenerateCommand extends Command {
  protected signature = "make:event <name>";
  protected description = "Create a new event class";

  protected arguments = {
    name: { type: "string" as const, description: "Event class name", required: true },
  };

  protected options = {
    queued: {
      type: "boolean" as const,
      description: "Make the event queueable",
      default: false,
      alias: "q",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const fs = await require("fs/promises");
    const path = await require("path");

    const eventName = args.name as string;
    const isQueued = args.queued as boolean;

    // Convert to proper class name (PascalCase)
    const className = eventName.replace(/[^a-zA-Z0-9]/g, "");

    // Convert to event name (dot notation)
    const eventDotName = eventName
      .replace(/([A-Z])/g, ".$1")
      .toLowerCase()
      .replace(/^\./, "")
      .replace(/\s+/g, ".");

    const template = `import { Event } from '@lara-node/events';

/*
|--------------------------------------------------------------------------
| ${className} Event
|--------------------------------------------------------------------------
|
| This event is fired when...
|
*/

export class ${className} extends Event {
${
  isQueued
    ? `    /**
     * Indicates if this event should be queued.
     */
    public shouldQueue = true;
    public queue = 'default';

`
    : ""
}    constructor(
        // Add your event properties here
        public id: string | number,
        public data?: Record<string, any>
    ) {
        super();
    }

    /**
     * Get the event name.
     */
    eventName(): string {
        return '${eventDotName}';
    }

    /**
     * Get the channels the event should broadcast on (optional).
     */
    // broadcastOn(): string[] {
    //     return ['channel-name'];
    // }
}
`;

    const eventsDir = path.join(process.cwd(), "src/app/Events");
    const filePath = path.join(eventsDir, `${className}.ts`);

    // Check if file exists
    try {
      await fs.access(filePath);
      this.error(`Event ${className} already exists at ${filePath}`);
      return;
    } catch {
      // File doesn't exist, good to create
    }

    await fs.writeFile(filePath, template);
    this.success(`Event created: src/app/Events/${className}.ts`);
    this.newLine();
    this.comment("Don't forget to export it from src/app/Events/index.ts:");
    this.line(`  export { ${className} } from './${className}';`);
  }
}

/*
|--------------------------------------------------------------------------
| Listener Generate Command
|--------------------------------------------------------------------------
|
| Generate a new listener class.
|
*/

export class ListenerGenerateCommand extends Command {
  protected signature = "make:listener <name>";
  protected description = "Create a new event listener class";

  protected arguments = {
    name: { type: "string" as const, description: "Listener class name", required: true },
  };

  protected options = {
    event: { type: "string" as const, description: "Event to listen for", alias: "e" },
    queued: {
      type: "boolean" as const,
      description: "Make the listener queueable",
      default: false,
      alias: "q",
    },
    queue: { type: "string" as const, description: "Queue name for queued listener" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const fs = await require("fs/promises");
    const path = await require("path");

    const listenerName = args.name as string;
    const eventName = (args.event as string) || "event.name";
    const isQueued = args.queued as boolean;
    const queueName = (args.queue as string) || "default";

    const className = listenerName.replace(/[^a-zA-Z0-9]/g, "");

    const queueDecorator = isQueued ? `@ShouldQueueDecorator({ queue: '${queueName}' })\n` : "";

    const imports = isQueued
      ? `import { Listener, ListensTo, ShouldQueueDecorator } from '@lara-node/events';`
      : `import { Listener, ListensTo } from '@lara-node/events';`;

    const template = `${imports}

/*
|--------------------------------------------------------------------------
| ${className} Listener
|--------------------------------------------------------------------------
|
| This listener handles the ${eventName} event.
|
*/

interface ${className}Payload {
    // Define your payload type here
    id: string | number;
    data?: Record<string, any>;
}

@ListensTo('${eventName}')
${queueDecorator}export class ${className} extends Listener<${className}Payload> {
    /**
     * Handle the event.
     */
    async handle(payload: ${className}Payload): Promise<void> {
        console.log(\`[${className}] Handling event with payload:\`, payload);

        // Your listener logic here
    }

    /**
     * Determine if the listener should handle the event.
     */
    shouldHandle(payload: ${className}Payload): boolean {
        return true;
    }

    /**
     * Handle a failed listener execution.
     */
    failed(payload: ${className}Payload, error: Error): void {
        console.error(\`[${className}] Failed:\`, error.message);
    }
}
`;

    const listenersDir = path.join(process.cwd(), "src/app/Listeners");
    const filePath = path.join(listenersDir, `${className}.ts`);

    try {
      await fs.access(filePath);
      this.error(`Listener ${className} already exists at ${filePath}`);
      return;
    } catch {
      // File doesn't exist, good to create
    }

    await fs.writeFile(filePath, template);
    this.success(`Listener created: src/app/Listeners/${className}.ts`);
    this.newLine();
    this.comment("Don't forget to export it from src/app/Listeners/index.ts:");
    this.line(`  export { ${className} } from './${className}';`);
  }
}

/*
|--------------------------------------------------------------------------
| Subscriber Generate Command
|--------------------------------------------------------------------------
|
| Generate a new event subscriber class.
|
*/

export class SubscriberGenerateCommand extends Command {
  protected signature = "make:subscriber <name>";
  protected description = "Create a new event subscriber class";

  protected arguments = {
    name: { type: "string" as const, description: "Subscriber class name", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const fs = await require("fs/promises");
    const path = await require("path");

    const subscriberName = args.name as string;
    const className = subscriberName.replace(/[^a-zA-Z0-9]/g, "");

    // Infer domain from name (e.g., UserEventSubscriber -> user)
    const domain = className
      .replace(/EventSubscriber$/, "")
      .replace(/Subscriber$/, "")
      .toLowerCase();

    const template = `import { EventDispatcher, EventSubscriber, Subscriber } from '@lara-node/events';

/*
|--------------------------------------------------------------------------
| ${className}
|--------------------------------------------------------------------------
|
| This subscriber handles all ${domain}-related events.
|
*/

@Subscriber()
export class ${className} implements EventSubscriber {
    /**
     * Register the listeners for the subscriber.
     */
    subscribe(dispatcher: EventDispatcher): void {
        dispatcher.listen('${domain}.created', this.onCreated.bind(this));
        dispatcher.listen('${domain}.updated', this.onUpdated.bind(this));
        dispatcher.listen('${domain}.deleted', this.onDeleted.bind(this));

        // Wildcard listener for all ${domain} events
        dispatcher.listen('${domain}.*', this.onAny${domain.charAt(0).toUpperCase() + domain.slice(1)}Event.bind(this));
    }

    /**
     * Handle ${domain} created events.
     */
    async onCreated(payload: any): Promise<void> {
        console.log(\`[${className}] ${domain} created:\`, payload);
    }

    /**
     * Handle ${domain} updated events.
     */
    async onUpdated(payload: any): Promise<void> {
        console.log(\`[${className}] ${domain} updated:\`, payload);
    }

    /**
     * Handle ${domain} deleted events.
     */
    async onDeleted(payload: any): Promise<void> {
        console.log(\`[${className}] ${domain} deleted:\`, payload);
    }

    /**
     * Handle any ${domain} event (wildcard).
     */
    async onAny${domain.charAt(0).toUpperCase() + domain.slice(1)}Event(payload: any): Promise<void> {
        // Audit logging, analytics, etc.
        console.log(\`[${className}] ${domain} event:\`, payload);
    }
}
`;

    const subscribersDir = path.join(process.cwd(), "src/app/Subscribers");

    // Ensure directory exists
    try {
      await fs.mkdir(subscribersDir, { recursive: true });
    } catch {
      // Directory exists
    }

    const filePath = path.join(subscribersDir, `${className}.ts`);

    try {
      await fs.access(filePath);
      this.error(`Subscriber ${className} already exists at ${filePath}`);
      return;
    } catch {
      // File doesn't exist, good to create
    }

    await fs.writeFile(filePath, template);
    this.success(`Subscriber created: src/app/Subscribers/${className}.ts`);
    this.newLine();
    this.comment("Don't forget to export it from src/app/Subscribers/index.ts:");
    this.line(`  export { ${className} } from './${className}';`);
  }
}
