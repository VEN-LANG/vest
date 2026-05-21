import fs from "fs";
import path from "path";
import { Argv } from "yargs";
import { Command } from "../Command.js";
import * as SystemCommands from "../Commands/index.js";
import { getRegisteredCommands } from "../decorators.js";
import { scheduler, Schedule } from "@lara-node/queue";
import type { Application } from "@lara-node/core";

export class Kernel {
  /** Additional commands registered by the app. Override via addCommand() or subclass. */
  protected commands: Array<new () => Command> = [];

  protected _scheduler: Schedule = scheduler;

  protected _app: Application | null = null;

  constructor(app?: Application) {
    if (app) this._app = app;
  }

  get app(): Application | null {
    return this._app;
  }

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

    const allAppCommands = [...this.commands, ...getRegisteredCommands()];
    for (const CommandClass of allAppCommands) {
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

  discoverCommands(dirPath: string): void {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
    for (const file of files) {
      const mod: Record<string, unknown> = require(path.join(dirPath, file));
      for (const exported of Object.values(mod)) {
        if (typeof exported === "function" && exported.prototype instanceof Command) {
          this.commands.push(exported as new () => Command);
        }
      }
    }
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
