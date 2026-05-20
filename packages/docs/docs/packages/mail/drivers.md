# Mail Drivers

LaraNode supports multiple mail drivers.

## SMTP Driver

Send emails via SMTP server:

```dotenv
MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=username
MAIL_PASSWORD=password
MAIL_FROM_ADDRESS=hello@example.com
MAIL_FROM_NAME="LaraNode App"
```

## Log Driver

Write emails to log (for development):

```dotenv
MAIL_DRIVER=log
```

## Array Driver

Store emails in memory (for testing):

```dotenv
MAIL_DRIVER=array
```

## Failover Driver

Try multiple mailers in order:

```typescript
// config/mail.config.ts
export default {
  driver: 'failover',
  failover: {
    mailers: ['smtp', 'log'],
  },
}
```

## Switching Drivers

```typescript
import { MailManager } from '@lara-node/mail'

const manager = new MailManager()

// Use specific mailer
manager.mailer('smtp').send(mailable)
manager.mailer('log').send(mailable)
```

## Next Steps

- [Mailables](/packages/mail/mailables) -- Building emails
- [Queued Mail](/packages/mail/queued) -- Queue emails
- [Mail Overview](/packages/mail) -- Mail overview
