# Mail Package

The `@lara-node/mail` package provides a multi-driver email system with fluent Mailable classes.

## Installation

```bash
pnpm add @lara-node/mail @lara-node/core nodemailer
```

## Overview

Features include:

- **Multiple drivers** -- SMTP, Log, Array, Failover
- **Mailable classes** for building emails
- **Fluent API** for composing emails
- **Queue support** for async sending
- **HTML and text** templates

## Quick Start

### Create a Mailable

```typescript
import { Mailable } from '@lara-node/mail'

class WelcomeMail extends Mailable {
  constructor(private user: User) {
    super()
  }

  build() {
    return this
      .to(this.user.email)
      .subject('Welcome to LaraNode!')
      .view('emails.welcome', { user: this.user })
  }
}
```

### Send Email

```typescript
import { Mail, sendMail } from '@lara-node/mail'

// Using facade
await Mail.to('user@example.com').send(new WelcomeMail(user))

// Using helper
await sendMail(new WelcomeMail(user))
```

## Key Exports

| Export | Description |
|--------|-------------|
| `Mail` | Mail facade |
| `MailManager` | Mail manager |
| `Mailer` | Fluent mailer |
| `Mailable` | Base mailable class |
| `sendMail()` | Send helper |
| `queueMail()` | Queue helper |

## Configuration

```typescript
// config/mail.config.ts
export default {
  driver: process.env.MAIL_DRIVER || 'log',
  from: {
    address: process.env.MAIL_FROM_ADDRESS,
    name: process.env.MAIL_FROM_NAME,
  },
  smtp: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  },
}
```

## Next Steps

- [Mailables](/packages/mail/mailables) -- Building emails
- [Mail Drivers](/packages/mail/drivers) -- SMTP, Log, Array
- [Queued Mail](/packages/mail/queued) -- Queue emails
