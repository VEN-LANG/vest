import { ServiceProvider } from '@lara-node/core';
import { Queue, QueueManager, scheduler, Schedule } from '@lara-node/queue';
import { CleanupJob } from '../Jobs/CleanupJob';
import { WelcomeEmailJob } from '../Jobs/WelcomeEmailJob';

export class QueueServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton(QueueManager, () => Queue);
    this.container.singleton(Schedule, () => scheduler);
  }

  boot(): void {
    scheduler.job(CleanupJob).dailyAt('02:00');
    scheduler.job(WelcomeEmailJob, { to: '', name: '' }).cron('0 9 * * 1');
  }
}
