export interface MailerConfig {
  transport: 'smtp' | 'log' | 'array';
  host?: string;
  port?: number;
  encryption?: 'tls' | 'ssl' | null;
  username?: string;
  password?: string;
  timeout?: number;
}

export interface MailConfig {
  default: string;
  mailers: Record<string, MailerConfig>;
  from: { address: string; name: string };
}

const mailConfig: MailConfig = {
  default: process.env.MAIL_MAILER || 'smtp',

  mailers: {
    smtp: {
      transport: 'smtp',
      host: process.env.MAIL_HOST || 'smtp.mailgun.org',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      encryption: (process.env.MAIL_ENCRYPTION as 'tls' | 'ssl' | null) || 'tls',
      username: process.env.MAIL_USERNAME || '',
      password: process.env.MAIL_PASSWORD || '',
      timeout: parseInt(process.env.MAIL_TIMEOUT || '30', 10),
    },
    log: {
      transport: 'log',
    },
    array: {
      transport: 'array',
    },
  },

  from: {
    address: process.env.MAIL_FROM_ADDRESS || 'hello@example.com',
    name: process.env.MAIL_FROM_NAME || 'apps/example',
  },
};

export default mailConfig;
