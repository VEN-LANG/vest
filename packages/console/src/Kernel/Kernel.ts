import { Argv } from "yargs";
import { Command } from "../Command.js";
import * as SystemCommands from "../Commands/index.js";
import { scheduler, Schedule } from "@vest-ts/queue";

export class Kernel {
  /** Additional commands registered by the app. Override via addCommand() or subclass. */
  protected commands: Array<new () => Command> = [];

  protected _scheduler: Schedule = scheduler;

  getCommands(): Command[] {
    const commandInstances: Command[] = [];

    for (const CommandClass of Object.values(SystemCommands)) {
      if (typeof CommandClass === "function" && CommandClass.prototype instanceof Command) {
        try {
          commandInstances.push(new (CommandClass as new () => Command)());
        } catch {
          /* skip */
        }
      }
    }

    for (const CommandClass of this.commands) {
      try {
        commandInstances.push(new CommandClass());
      } catch {
        /* skip */
      }
    }

    return commandInstances;
  }

  registerCommands(cli: Argv): Argv {
    for (const command of this.getCommands()) {
      cli = command.buildCommand(cli);
    }
    return cli;
  }

  addCommand(command: new () => Command): void {
    this.commands.push(command);
  }

  protected schedule(): void {}

  async boot(): Promise<void> {
    this.schedule();
  }

  getScheduler(): Schedule {
    return this._scheduler;
  }
}
