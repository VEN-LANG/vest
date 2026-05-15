import { Command } from "../Command.js";
import { ArgumentsCamelCase } from "yargs";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheHas,
  cacheClear,
  cacheKeys,
  generateCacheKey,
} from "@vest-ts/cache";

export class CacheClearCommand extends Command {
  protected signature = "cache:clear";
  protected description = "Flush the application cache";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    await cacheClear();
    this.info("Application cache cleared successfully.");
  }
}

export class CacheListCommand extends Command {
  protected signature = "cache:list";
  protected description = "List all cache keys";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const keys = await cacheKeys();

    if (!keys.length) {
      this.line("(no keys)");
    } else {
      keys.forEach((k) => this.line(k));
      this.newLine();
      this.info(`Total: ${keys.length}`);
    }
  }
}

export class CacheGetCommand extends Command {
  protected signature = "cache:get <key>";
  protected description = "Get a cached value by key";

  protected arguments = {
    key: { type: "string" as const, description: "The cache key", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const val = await cacheGet(String(args.key));

    if (val === null) {
      this.line("(null)");
    } else {
      this.line(typeof val === "string" ? val : JSON.stringify(val, null, 2));
    }
  }
}

export class CacheSetCommand extends Command {
  protected signature = "cache:set <key> <value>";
  protected description = "Set a cached value";

  protected arguments = {
    key: { type: "string" as const, description: "The cache key", required: true },
    value: { type: "string" as const, description: "The value to cache", required: true },
  };

  protected options = {
    ttl: { type: "number" as const, description: "TTL in seconds", default: 0 },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const key = String(args.key);
    const raw = String(args.value);
    const value = this.parseMaybeJson(raw);
    const ttl = args.ttl as number;

    await cacheSet(key, value, ttl && ttl > 0 ? ttl : undefined);
    this.info("OK");
  }

  private parseMaybeJson(input: string): any {
    if (!input) return input;
    const first = input.trim()[0];
    if (first === "{" || first === "[") {
      try {
        return JSON.parse(input);
      } catch {
        return input;
      }
    }
    return input;
  }
}

export class CacheForgetCommand extends Command {
  protected signature = "cache:forget <key>";
  protected description = "Remove an item from the cache";

  protected arguments = {
    key: { type: "string" as const, description: "The cache key to forget", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const deleted = await cacheDel(String(args.key));

    if (deleted) {
      this.info("The key has been removed from cache.");
    } else {
      this.warn("Key not found in cache.");
    }
  }
}

export class CacheHasCommand extends Command {
  protected signature = "cache:has <key>";
  protected description = "Check if a key exists in the cache";

  protected arguments = {
    key: { type: "string" as const, description: "The cache key", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const exists = await cacheHas(String(args.key));
    this.line(exists ? "true" : "false");
  }
}

export class CacheKeyCommand extends Command {
  protected signature = "cache:key <parts...>";
  protected description = "Generate a cache key from parts";

  protected arguments = {
    parts: { type: "string" as const, description: "Parts to join as cache key", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const parts = args.parts as string[];
    const key = generateCacheKey(...parts);
    this.line(key);
  }
}

export class CacheDriverCommand extends Command {
  protected signature = "cache:driver";
  protected description = "Show cache driver information";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const driver = (process.env.CACHE_DRIVER || "file").toLowerCase();
    const prefix = process.env.CACHE_PREFIX || "(none)";

    this.info("Cache Driver Information:");
    this.table(
      ["Setting", "Value"],
      [
        ["Driver", driver],
        ["Prefix", prefix],
      ],
    );
  }
}
