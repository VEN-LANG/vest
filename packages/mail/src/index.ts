/*
|--------------------------------------------------------------------------
| Mail Module Exports
|--------------------------------------------------------------------------
|
| Export all mail-related classes and utilities.
|
*/

import { setConfig } from "@lara-node/core";
import _mailConfig from "./mail.config.js";
setConfig("mail", _mailConfig as unknown as Record<string, unknown>);
export { default as mailConfig } from "./mail.config.js";
export type { MailConfig, MailerConfig, MailAddress } from "./mail.config.js";

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
