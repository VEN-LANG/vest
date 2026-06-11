import { ArgumentsCamelCase } from "yargs";
import { Command } from "../Command.js";
import {
  allConfig,
  config as getConfig,
  cacheConfig,
  clearConfigCache,
  hasConfigCacheBackend,
} from "@lara-node/core";

/*
|--------------------------------------------------------------------------
| Config Commands
|--------------------------------------------------------------------------
|
| Persist / inspect the resolved application config. The snapshot is stored
| through the cache backend wired by CacheServiceProvider, so workers and
| other processes can restore it without re-reading the config directory.
|
*/

export class ConfigCacheCommand extends Command {
  protected signature = "config:cache";
  protected description = "Persist the resolved config snapshot to the cache for faster retrieval";

  async handle(): Promise<void> {
    if (!hasConfigCacheBackend()) {
      this.warn("No cache backend wired — ensure CacheServiceProvider is registered.");
      return;
    }
    const ok = await cacheConfig();
    if (ok) this.info(`Configuration cached (${Object.keys(allConfig()).length} namespaces).`);
    else this.warn("Configuration could not be cached.");
  }
}

export class ConfigClearCommand extends Command {
  protected signature = "config:clear";
  protected description = "Remove the cached config snapshot";

  async handle(): Promise<void> {
    if (!hasConfigCacheBackend()) {
      this.warn("No cache backend wired — nothing to clear.");
      return;
    }
    await clearConfigCache();
    this.info("Configuration cache cleared.");
  }
}

export class ConfigShowCommand extends Command {
  protected signature = "config:show";
  protected description = "Print resolved config — all namespaces, or a dot-path key";

  protected options = {
    key: {
      type: "string" as const,
      description: "Dot-path key to display (e.g. queue.default). Omit for everything.",
      alias: "k",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const key = args.key as string | undefined;
    const value = key ? getConfig(key) : allConfig();
    if (value === undefined) {
      this.warn(`No config found for [${key}].`);
      return;
    }
    this.line(JSON.stringify(value, null, 2));
  }
}
