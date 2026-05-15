import { QueueServiceProvider as BaseProvider } from "@vest-ts/queue";

/**
 * QueueServiceProvider
 *
 * Override `schedule()` to register cron tasks. Framework queue
 * infrastructure (drivers, worker, etc.) is handled in @vest-ts/queue.
 *
 * @example
 * protected schedule(): void {
 *   this.scheduler.command('invoice:mark-overdue').dailyAt('00:00');
 *   this.scheduler.call(async () => { ... }).everyFiveMinutes();
 * }
 */
export class QueueServiceProvider extends BaseProvider {
  protected override schedule(): void {
    // Define your scheduled tasks here
  }
}
