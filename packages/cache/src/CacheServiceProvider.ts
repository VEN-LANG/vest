import { ServiceProvider, type CommandClass } from "@lara-node/core";
import { initCache, getCacheDriver as getCache, getCacheDriverName } from "./CacheManager.js";
import {
  CacheClearCommand, CacheListCommand, CacheGetCommand, CacheSetCommand,
  CacheForgetCommand, CacheHasCommand, CacheKeyCommand, CacheDriverCommand,
} from "./Commands.js";

export class CacheServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton("cache", () => getCache());
  }

  commands(): CommandClass[] {
    return [
      CacheClearCommand, CacheListCommand, CacheGetCommand, CacheSetCommand,
      CacheForgetCommand, CacheHasCommand, CacheKeyCommand, CacheDriverCommand,
    ];
  }

  async boot(): Promise<void> {
    const skip = (process.env.SKIP_CACHE ?? "").toLowerCase();
    if (skip === "1" || skip === "true") {
      console.warn("[Cache] SKIP_CACHE set — skipping cache initialization");
      return;
    }
    try {
      await initCache();
      console.log(`[Cache] Initialized (driver=${getCacheDriverName()})`);
    } catch (err: any) {
      console.error("[Cache] Initialization failed:", err.message);
    }
  }
}
