export const mailConfig = {
  default: process.env.MAIL_MAILER || 'log',
  mailers: {
    smtp: {
      transport: 'smtp',
      host: process.env.MAIL_HOST || 'mailpit',
      port: Number(process.env.MAIL_PORT) || 1025,
      encryption: process.env.MAIL_ENCRYPTION || '',
      username: process.env.MAIL_USERNAME || '',
      password: process.env.MAIL_PASSWORD || '',
    },
    log: { transport: 'log' },
    array: { transport: 'array' },
  },
  from: {
    address: process.env.MAIL_FROM_ADDRESS || 'hello@example.com',
    name: process.env.MAIL_FROM_NAME || 'Lara App',
  },
};

export default mailConfig;
