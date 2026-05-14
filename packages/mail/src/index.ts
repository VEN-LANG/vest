/*
|--------------------------------------------------------------------------
| Mail Module Exports
|--------------------------------------------------------------------------
|
| Export all mail-related classes and utilities.
|
*/

// Types
export * from "./types.js";

// Drivers
export { SmtpDriver, LogDriver, ArrayDriver, FailoverDriver } from "./Drivers/index.js";

// Mailable
export { Mailable, TextMailable, HtmlMailable } from "./Mailable.js";

// Mail Service & Manager (re-export from Services)
export {
  MailManager,
  Mailer,
  Mail,
  sendMail,
  queueMail,
  mail,
  MailService,
} from "./MailService.js";
export { MailServiceProvider } from "./MailServiceProvider.js";
