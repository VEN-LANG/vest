import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ensure .env loaded if this module is imported directly
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/*
|--------------------------------------------------------------------------
| Mail Configuration
|--------------------------------------------------------------------------
|
| Here you may configure all of the mailers used by your application plus
| their respective settings. Several examples have been configured for you
| and you are free to add your own as your application requires.
|
| Supported: "smtp", "sendmail", "mailgun", "ses", "postmark",
|            "log", "array", "failover"
|
*/

export interface MailerConfig {
  transport: "smtp" | "sendmail" | "mailgun" | "ses" | "postmark" | "log" | "array" | "failover";
  host?: string;
  port?: number;
  encryption?: "tls" | "ssl" | null;
  username?: string;
  password?: string;
  timeout?: number;
  localDomain?: string;
  // Mailgun specific
  domain?: string;
  secret?: string;
  endpoint?: string;
  // SES specific
  region?: string;
  key?: string;
  // Postmark specific
  token?: string;
  // Failover specific
  mailers?: string[];
  // Log specific
  channel?: string;
}

export interface MailConfig {
  default: string;
  mailers: Record<string, MailerConfig>;
  from: {
    address: string;
    name: string;
  };
  markdown: {
    theme: string;
    paths: string[];
  };
}

const mailConfig: MailConfig = {
  /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | This option controls the default mailer that is used to send any email
    | messages sent by your application. Alternative mailers may be setup
    | and used as needed; however, this mailer will be used by default.
    |
    */
  default: process.env.MAIL_MAILER || "smtp",

  /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | Here you may configure all of the mailers used by your application plus
    | their respective settings. Several examples have been configured for
    | you and you are free to add your own as your application requires.
    |
    */
  mailers: {
    smtp: {
      transport: "smtp",
      host: process.env.MAIL_HOST || "smtp.mailgun.org",
      port: parseInt(process.env.MAIL_PORT || "587", 10),
      encryption: (process.env.MAIL_ENCRYPTION as "tls" | "ssl" | null) || "tls",
      username: process.env.MAIL_USERNAME || "",
      password: process.env.MAIL_PASSWORD || "",
      timeout: parseInt(process.env.MAIL_TIMEOUT || "30", 10),
      localDomain: process.env.MAIL_EHLO_DOMAIN || undefined,
    },

    ses: {
      transport: "ses",
      key: process.env.AWS_ACCESS_KEY_ID || "",
      secret: process.env.AWS_SECRET_ACCESS_KEY || "",
      region: process.env.AWS_DEFAULT_REGION || "us-east-1",
    },

    mailgun: {
      transport: "mailgun",
      domain: process.env.MAILGUN_DOMAIN || "",
      secret: process.env.MAILGUN_SECRET || "",
      endpoint: process.env.MAILGUN_ENDPOINT || "api.mailgun.net",
    },

    postmark: {
      transport: "postmark",
      token: process.env.POSTMARK_TOKEN || "",
    },

    sendmail: {
      transport: "sendmail",
    },

    log: {
      transport: "log",
      channel: process.env.MAIL_LOG_CHANNEL || "default",
    },

    array: {
      transport: "array",
    },

    failover: {
      transport: "failover",
      mailers: ["smtp", "log"],
    },
  },

  /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    |
    | You may wish for all e-mails sent by your application to be sent from
    | the same address. Here, you may specify a name and address that is
    | used globally for all e-mails that are sent by your application.
    |
    */
  from: {
    address: process.env.MAIL_FROM_ADDRESS || "hello@example.com",
    name: process.env.MAIL_FROM_NAME || "Example",
  },

  /*
    |--------------------------------------------------------------------------
    | Markdown Mail Settings
    |--------------------------------------------------------------------------
    |
    | If you are using Markdown based email rendering, you may configure your
    | theme and component paths here, allowing you to customize the design
    | of the emails. Or, you may simply stick with the defaults!
    |
    */
  markdown: {
    theme: "default",
    paths: [path.resolve(__dirname, "../resources/views/vendor/mail")],
  },
};

export default mailConfig;
