import { Job, Queueable } from "@vest/queue";
import { Mail, MailMessage } from "@vest/mail";

/*
|--------------------------------------------------------------------------
| Send Mail Job
|--------------------------------------------------------------------------
|
| This job handles sending emails in the background using the Mail system.
| It receives a mail message and sends it through the configured mailer.
|
*/

interface SendMailJobData {
  message: MailMessage;
  mailer?: string;
}

@Queueable()
export class SendMailJob extends Job {
  /*
    |--------------------------------------------------------------------------
    | Job Configuration
    |--------------------------------------------------------------------------
    */

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
    | Job Data
    |--------------------------------------------------------------------------
    */

  public message: MailMessage | null = null;
  public mailerName: string = "default";

  /*
    |--------------------------------------------------------------------------
    | Factory Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Create a new job instance with mail data.
   */
  static make(data: SendMailJobData): SendMailJob {
    const job = new SendMailJob();
    job.message = data.message;
    job.mailerName = data.mailer || "default";
    return job;
  }

  /*
    |--------------------------------------------------------------------------
    | Handle the Job
    |--------------------------------------------------------------------------
    */

  async handle(): Promise<void> {
    if (!this.message) {
      throw new Error("No message provided to SendMailJob");
    }

    const toAddresses = this.extractToAddresses();
    console.log(`[SendMailJob] Sending email to: ${toAddresses.join(", ")}`);
    console.log(`[SendMailJob] Subject: ${this.message.subject}`);
    console.log(`[SendMailJob] Using mailer: ${this.mailerName}`);

    // Send the email using the configured mailer
    const result = await Mail().mailer(this.mailerName).raw(this.message);

    console.log(`[SendMailJob] Email sent successfully`);
    console.log(`[SendMailJob] Message ID: ${result.messageId}`);
    console.log(`[SendMailJob] Accepted: ${result.accepted.join(", ")}`);

    if (result.rejected.length > 0) {
      console.warn(`[SendMailJob] Rejected: ${result.rejected.join(", ")}`);
    }
  }

  /*
    |--------------------------------------------------------------------------
    | Handle Failure
    |--------------------------------------------------------------------------
    */

  failed(exception: Error): void {
    const toAddresses = this.extractToAddresses();
    console.error(
      `[SendMailJob] Failed to send email to ${toAddresses.join(", ")}: ${exception.message}`,
    );
    // Log to error tracking service, notify admin, etc.
  }

  /*
    |--------------------------------------------------------------------------
    | Display Name
    |--------------------------------------------------------------------------
    */

  displayName(): string {
    const toAddresses = this.extractToAddresses();
    return `SendMailJob(to:${toAddresses.join(",")})`;
  }

  /*
    |--------------------------------------------------------------------------
    | Tags for Monitoring
    |--------------------------------------------------------------------------
    */

  tags(): string[] {
    const toAddresses = this.extractToAddresses();
    return ["mail", "email", `mailer:${this.mailerName}`, ...toAddresses.map((a) => `to:${a}`)];
  }

  /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

  private extractToAddresses(): string[] {
    if (!this.message?.to) return [];

    const to = this.message.to;
    if (Array.isArray(to)) {
      return to.map((a) => (typeof a === "string" ? a : a.address));
    }
    return [typeof to === "string" ? to : to.address];
  }
}
