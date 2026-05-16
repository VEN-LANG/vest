import { Job, Queueable } from '@lara-node/queue';

@Queueable({ queue: 'default', tries: 1 })
export class CleanupJob extends Job {
  async handle(): Promise<void> {
    console.log('[CleanupJob] Running cleanup...');
  }
}
