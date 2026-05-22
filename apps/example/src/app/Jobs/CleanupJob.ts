import { Job, Queueable } from '@lara-node/queue';

/*
|--------------------------------------------------------------------------
| CleanupJob
|--------------------------------------------------------------------------
|
| Scheduled via QueueServiceProvider:
|   scheduler.job(CleanupJob).daily();
|
*/
@Queueable({ queue: 'default', tries: 1 })
export class CleanupJob extends Job {
  // Override shouldQueue() to conditionally dispatch:
  // shouldQueue(): boolean { return someCondition; }
  async handle(): Promise<void> {
    console.log('[CleanupJob] Running cleanup tasks...');

    // Delete soft-deleted records older than 30 days
    // const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // await User.query().onlyTrashed().where('deleted_at', '<', cutoff).forceDelete();

    // Remove expired sessions / tokens
    // await Token.where('expires_at', '<', new Date()).delete();

    // Remove old upload files
    // await File.query().where('created_at', '<', cutoff).delete();

    console.log('[CleanupJob] Cleanup complete');
  }
}
