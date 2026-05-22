import { ServiceProvider } from '@lara-node/core';
import { Queue, QueueManager, scheduler, Schedule } from '@lara-node/queue';
import { CleanupJob } from '../Jobs/CleanupJob';
import { GenerateReportJob } from '../Jobs/GenerateReportJob';

/*
|--------------------------------------------------------------------------
| QueueServiceProvider
|--------------------------------------------------------------------------
|
| Registers the queue manager and scheduler, then defines recurring tasks.
|
| Schedule API:
|   scheduler.command('permissions:sync').daily();          // every day at midnight
|   scheduler.command('permissions:sync').hourly();         // every hour
|   scheduler.job(CleanupJob).dailyAt('02:00');             // daily at 2 AM
|   scheduler.job(GenerateReportJob).weekly();              // every Sunday at midnight
|   scheduler.job(GenerateReportJob).monthly();             // 1st of month at midnight
|   scheduler.call(() => console.log('tick')).everyMinute();
|   scheduler.command('cache:clear').cron('0 * * * *');     // raw cron expression
|
*/
export class QueueServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton(QueueManager, () => Queue);
    this.container.alias(QueueManager, 'queue');
    this.container.singleton(Schedule, () => scheduler);
    this.container.alias(Schedule, 'schedule');
  }

  boot(): void {
    // Sync permissions nightly
    scheduler.command('permissions:sync').dailyAt('00:05');

    // Purge soft-deleted records every night at 2 AM
    scheduler.job(CleanupJob).dailyAt('02:00');

    // Generate weekly usage report every Sunday at 8 AM
    scheduler.job(GenerateReportJob, { type: 'users', period: 'weekly' }).weekly();

    // Generate monthly report on the 1st at 6 AM
    scheduler.job(GenerateReportJob, { type: 'activity', period: 'monthly' }).monthlyOn(1, '06:00');
  }
}
