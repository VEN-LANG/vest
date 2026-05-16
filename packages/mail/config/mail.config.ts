export interface MailAddress {
  name?: string;
  address: string;
}

export interface MailerConfig {
  transport:
    | "smtp"
    | "log"
    | "array"
    | "failover"
    | "sendmail"
    | "ses"
    | "mailgun"
    | "postmark"
    | string;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  encryption?: "tls" | "ssl" | null;
  timeout?: number;
  mailers?: string[];
  channel?: string;
}

export interface MailConfig {
  default: string;
  mailers: Record<string, MailerConfig>;
  from: MailAddress;
  markdown?: { theme: string; paths: string[] };
}

const mailConfig: MailConfig = {
  default: process.env.MAIL_MAILER ?? "smtp",
  mailers: {
    smtp: {
      transport: "smtp",
      host: process.env.MAIL_HOST ?? "smtp.mailhog.example",
      port: parseInt(process.env.MAIL_PORT ?? "1025", 10),
      secure: (process.env.MAIL_ENCRYPTION ?? "").toLowerCase() === "ssl",
      username: process.env.MAIL_USERNAME,
      password: process.env.MAIL_PASSWORD,
      encryption: (process.env.MAIL_ENCRYPTION as any) ?? null,
      timeout: 10000,
    },
    log: { transport: "log" },
    array: { transport: "array" },
    failover: {
      transport: "failover",
      mailers: (process.env.MAIL_FAILOVER_MAILERS ?? "smtp,log").split(","),
    },
  },
  from: {
    address: process.env.MAIL_FROM_ADDRESS ?? "hello@example.com",
    name: process.env.MAIL_FROM_NAME ?? process.env.APP_NAME ?? "Lara-Node",
  },
};

export default mailConfig;
