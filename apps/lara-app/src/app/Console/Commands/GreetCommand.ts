import { Command } from '@lara-node/console';
import type { ArgumentsCamelCase } from 'yargs';

export class GreetCommand extends Command {
  protected signature = 'greet';
  protected description = 'Greet a user by name';
  protected options = {
    name: { type: 'string' as const, description: 'Name to greet', default: 'World' },
    shout: { type: 'boolean' as const, description: 'Shout the greeting', default: false },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const name = args.name as string;
    const shout = args.shout as boolean;
    const message = `Hello, ${name}!`;
    this.info(shout ? message.toUpperCase() : message);
  }
}
