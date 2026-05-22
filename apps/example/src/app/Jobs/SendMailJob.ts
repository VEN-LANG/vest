import { Job, Queueable } from '@lara-node/queue';

/*
|--------------------------------------------------------------------------
| SendMailJob
|--------------------------------------------------------------------------
|
| @Queueable sets the default queue and retry count for every dispatch.
| Override per-dispatch with fluent methods:
|   SendMailJob.dispatch().onQueue('urgent').tries(5).dispatch();
|
| Conditional dispatch via shouldQueue():
|   shouldQueue() { return !this.payload.suppressEmail; }
|
*/
@Queueable({ queue: 'emails', tries: 3 })
export class SendMailJob extends Job {
  constructor(
    private readonly payload: {
      to: string;
      subject: string;
      body: string;
      template?: string;
      data?: Record<string, unknown>;
    },
  ) { super(); }

  async handle(): Promise<void> {
    console.log(`[SendMailJob] Sending to ${this.payload.to}: ${this.payload.subject}`);
    // Inject MailService or use @lara-node/mail directly:
    // const { Mail } = await import('@lara-node/mail');
    // await Mail.send(new WelcomeEmail(this.payload.to));
  }

  async failed(error: Error): Promise<void> {
    console.error(`[SendMailJob] Failed for ${this.payload.to}: ${error.message}`);
  }
}
