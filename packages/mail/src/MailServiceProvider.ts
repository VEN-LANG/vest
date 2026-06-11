import { ServiceProvider } from "@lara-node/core";
import { registerSendMailJob } from "./MailService.js";
import { SendMailJob } from "./SendMailJob.js";

export class MailServiceProvider extends ServiceProvider {
  register(): void {
    // Mail is accessed via the Mail() facade function — no container binding needed.
  }

  boot(): void {
    // Wire the queued-send path (Mailer.queue() / Mailer.later()) to the default
    // SendMailJob. Applications can override this by calling
    // registerSendMailJob(YourJob) after this provider has booted.
    registerSendMailJob(SendMailJob);
  }
}
