import fs from "fs";
import path from "path";
import { Argv } from "yargs";
import { Command } from "../Command.js";
import * as SystemCommands from "../Commands/index.js";
import { getRegisteredCommands } from "../decorators.js";
import { container } from "@lara-node/core";
import type { Application, ServiceProvider, CommandClass } from "@lara-node/core";

/*
 * Commands are resolved through the container, so a command may declare the
 * services it needs on its constructor and receive them — the same deal
 * controllers get:
 *
 *   @Injectable()
 *   export class SyncTariffsCommand extends Command {
 *     constructor(private readonly tariffs: TariffService) { super(); }
 *   }
 *
 * A command whose dependencies cannot be built is reported rather than
 * silently dropped. Skipping quietly meant a typo in a constructor made the
 * command disappear from `artisan --help` with nothing to explain why.
 */
function instantiate(Ctor: new (...args: any[]) => Command): Command | null {
  try {
    return container.make(Ctor);
  } catch (error) {
    console.warn(
      `[Console] Skipping command ${Ctor.name}: could not resolve its dependencies.`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export class Kernel {
  /** Additional commands registered by the app. Override via addCommand() or subclass. */
  protected commands: Array<new () => Command> = [];

  /** Service providers whose commands() method should be collected at boot. */
  protected _providers: ServiceProvider[] = [];

  protected _app: Application | null = null;

  constructor(app?: Application) {
    if (app) this._app = app;
  }

  get app(): Application | null {
    return this._app;
  }

  /** Register service providers so their declared commands are auto-collected. */
  setProviders(providers: ServiceProvider[]): void {
    this._providers = providers;
  }

  getCommands(): Command[] {
    const commandInstances: Command[] = [];

    for (const CommandClass of Object.values(SystemCommands)) {
      if (typeof CommandClass === "function" && CommandClass.prototype instanceof Command) {
        const instance = instantiate(CommandClass as new (...args: any[]) => Command);
        if (instance) commandInstances.push(instance);
      }
    }

    const allAppCommands = [...this.commands, ...getRegisteredCommands()];
    for (const CommandClass of allAppCommands) {
      const instance = instantiate(CommandClass as new (...args: any[]) => Command);
      if (instance) commandInstances.push(instance);
    }

    // Collect commands declared in service providers
    for (const provider of this._providers) {
      const cmds = provider.commands() as CommandClass[];
      for (const Ctor of cmds) {
        const instance = instantiate(Ctor as new (...args: any[]) => Command);
        if (instance) commandInstances.push(instance);
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

  async boot(): Promise<void> {}
}
