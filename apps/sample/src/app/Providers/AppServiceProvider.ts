import { ServiceProvider } from "@vest-ts/core";
import { scheduler } from "@vest-ts/queue";

export class AppServiceProvider extends ServiceProvider {
  register(): void {}

  async boot(): Promise<void> {
    // Clean up soft-deleted posts every night at 2am
    scheduler
      .call(async () => {
        console.log("[Scheduler] Purging soft-deleted posts…");
      })
      .dailyAt("02:00")
      .description("Purge soft-deleted posts");
  }
}
