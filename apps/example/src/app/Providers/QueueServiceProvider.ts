import { QueueServiceProvider as BaseProvider } from '@lara-node/queue';
import { scheduler } from '@lara-node/queue';
import { CleanupJob } from '../Jobs/CleanupJob';
import { GenerateReportJob } from '../Jobs/GenerateReportJob';
import { PermissionsSyncCommand } from '../Console/Commands/PermissionCommands';

/*
|--------------------------------------------------------------------------
| QueueServiceProvider
|--------------------------------------------------------------------------
|
| Extends the framework QueueServiceProvider (which registers QueueManager,
| scheduler bindings, and all queue/schedule commands automatically).
|
| Use boot() to define app-specific scheduled tasks.
| Use commands() to expose additional app-specific CLI commands.
|
| Schedule API:
|   scheduler.command('permissions:sync').dailyAt('00:05');
|   scheduler.job(CleanupJob).dailyAt('02:00');
|   scheduler.call(() => {}).everyMinute();
|   scheduler.command('cache:clear').cron('0 * * * *');
|
*/
export class QueueServiceProvider extends BaseProvider {
  override commands() {
    // PermissionsSyncCommand is auto-discovered from Console/Commands/ by ConsoleKernel
    return super.commands();
  }

  override boot(): void {
    super.boot();

    // App-specific scheduled tasks
    scheduler.command('permissions:sync').dailyAt('00:05');
    scheduler.job(CleanupJob).dailyAt('02:00');
    scheduler.job(GenerateReportJob).weekly();
    scheduler.job(GenerateReportJob).monthlyOn(1, '06:00');
  }
}
