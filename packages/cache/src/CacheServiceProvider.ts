import { ServiceProvider } from "@lara-node/core";
import { initCache, getCacheDriver as getCache, getCacheDriverName } from "./CacheManager.js";

export class CacheServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton("cache", () => getCache());
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
