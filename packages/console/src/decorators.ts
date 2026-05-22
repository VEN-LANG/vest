import type { Command } from "./Command.js";

const commandRegistry: Array<new () => Command> = [];

export function getRegisteredCommands(): Array<new () => Command> {
  return commandRegistry;
}

/**
 * @Artisan()
 *
 * Class decorator that auto-registers an artisan Command for discovery.
 * Use this for commands defined outside the `app/Console/Commands` directory.
 *
 * The decorated class must extend `Command` from `@lara-node/console`.
 * Any module that imports the file will trigger registration automatically.
 *
 * @example
 * import { Command, Artisan } from '@lara-node/console';
 *
 * @Artisan()
 * export class SendNewsletterCommand extends Command {
 *   protected signature = 'newsletter:send';
 *   protected description = 'Send the daily newsletter';
 *
 *   async handle() { ... }
 * }
 */
export function Artisan(): ClassDecorator {
  return (target) => {
    const cls = target as unknown as new () => Command;
    if (!commandRegistry.includes(cls)) {
      commandRegistry.push(cls);
    }
  };
}
