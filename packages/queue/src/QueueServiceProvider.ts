import { ServiceProvider } from "@lara-node/core";
import { Queue, QueueManager, scheduler, Schedule } from "./index.js";

/**
 * Framework QueueServiceProvider.
 *
 * Override `schedule()` in your app's Console Kernel (or your own QueueServiceProvider)
 * to register cron tasks.
 *
 * @example
 * // app/Providers/QueueServiceProvider.ts
 * import { QueueServiceProvider as BaseProvider } from '@lara-node/queue';
 *
 * export class QueueServiceProvider extends BaseProvider {
 *   protected schedule(): void {
 *     this.scheduler.command('invoice:mark-overdue').dailyAt('00:00');
 *   }
 * }
 */
export class QueueServiceProvider extends ServiceProvider {
  protected scheduler = scheduler;

  register(): void {
    this.container.singleton(QueueManager, () => Queue);
    this.container.alias(QueueManager, "queue");
    this.container.singleton(Schedule, () => scheduler);
    this.container.alias(Schedule, "schedule");
  }

  boot(): void {
    this.schedule();
  }

  /** Override to define scheduled tasks. */
  protected schedule(): void {}

  provides(): string[] {
    return ["queue", "schedule", QueueManager.name, Schedule.name];
  }
}
