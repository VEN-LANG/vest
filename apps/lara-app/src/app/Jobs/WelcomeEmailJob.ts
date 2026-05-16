import { Job, Queueable } from '@lara-node/queue';

@Queueable({ queue: 'emails', tries: 3, backoff: 60 })
export class WelcomeEmailJob extends Job {
  constructor(
    private readonly payload: { to: string; name: string },
  ) { super(); }

  async handle(): Promise<void> {
    console.log(`[WelcomeEmailJob] Sending welcome email to ${this.payload.to}`);
  }

  async failed(error: Error): Promise<void> {
    console.error(`[WelcomeEmailJob] Failed for ${this.payload.to}: ${error.message}`);
  }
}
