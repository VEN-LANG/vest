import {
  ServiceProvider,
  type CommandClass,
  setConfigCacheBackend,
  restoreConfigFromCache,
  cacheConfig,
} from "@lara-node/core";
import {
  initCache,
  getCacheDriver as getCache,
  getCacheDriverName,
  cacheGet,
  cacheSet,
  cacheDel,
} from "./CacheManager.js";
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

      // Wire config caching: core persists/restores the resolved config snapshot
      // through the application cache (core can't depend on this package directly).
      setConfigCacheBackend({
        get: (k: string) => cacheGet(k),
        set: async (k: string, v: unknown) => {
          await cacheSet(k, v);
        },
        forget: async (k: string) => {
          await cacheDel(k);
        },
      });

      // Use a previously cached snapshot when present; otherwise persist the
      // config resolved so far so subsequent processes can read it quickly.
      const restored = await restoreConfigFromCache();
      if (!restored) await cacheConfig();
    } catch (err: any) {
      console.error("[Cache] Initialization failed:", err.message);
    }
  }
}
