import { Job, Queueable } from "@lara-node/queue";
import { Mail } from "./MailService.js";
import { MailMessage } from "./types.js";

/*
|--------------------------------------------------------------------------
| Send Mail Job
|--------------------------------------------------------------------------
|
| The default job used by Mailer.queue() / Mailer.later() to send a mail
| message in the background. It is registered automatically by the
| MailServiceProvider, so applications do not need to define their own.
|
| To customise queueing behaviour (queue name, tries, drivers, etc.) define
| your own Job and register it via registerSendMailJob(YourJob).
|
*/

interface SendMailJobData {
  message: MailMessage;
  mailer?: string;
}

@Queueable({ name: "SendMailJob" })
export class SendMailJob extends Job {
  /**
   * The queue this job should be sent to.
   */
  public queue = "emails";

  /**
   * Number of times to attempt the job.
   */
  public tries = 3;

  /**
   * Seconds before timing out.
   */
  public timeout = 60;

  /**
   * Backoff delays between retries (seconds).
   */
  public backoff = [30, 60, 120];

  /*
    |--------------------------------------------------------------------------
    | Job Data (serialized onto the queue)
    |--------------------------------------------------------------------------
    */

  public message: MailMessage | null = null;
  public mailerName: string = "default";

  /**
   * Create a new job instance from a mail message.
   */
  static make(data: SendMailJobData): SendMailJob {
    const job = new SendMailJob();
    job.message = data.message;
    job.mailerName = data.mailer || "default";
    return job;
  }

  /**
   * Send the queued mail message through the configured mailer.
   */
  async handle(): Promise<void> {
    if (!this.message) {
      throw new Error("SendMailJob has no message to send.");
    }

    await Mail().mailer(this.mailerName).raw(this.message);
  }

  /**
   * Handle a permanent failure.
   */
  failed(exception: Error): void {
    console.error(`[SendMailJob] Failed to send mail via ${this.mailerName}: ${exception.message}`);
  }

  /**
   * Human-readable name for monitoring dashboards.
   */
  displayName(): string {
    return `SendMailJob(${this.extractToAddresses().join(",")})`;
  }

  /**
   * Tags for monitoring (Horizon / Telescope).
   */
  tags(): string[] {
    return ["mail", `mailer:${this.mailerName}`, ...this.extractToAddresses().map((a) => `to:${a}`)];
  }

  private extractToAddresses(): string[] {
    const to = this.message?.to;
    if (!to) return [];
    const list = Array.isArray(to) ? to : [to];
    return list.map((a) => (typeof a === "string" ? a : a.address));
  }
}
