# Queued Mail

Send emails asynchronously via the queue system.

## Queueing Emails

```typescript
import { queueMail, Mail } from '@lara-node/mail'

// Queue for later
await queueMail(new WelcomeMail(user))

// Queue with delay
await Mail.to(user.email).later(new WelcomeMail(user), 300) // 5 minutes
```

## In Mailables

```typescript
class WelcomeMail extends Mailable {
  queue = 'emails'
  delay = 60

  build() {
    return this
      .to(this.user.email)
      .subject('Welcome!')
      .text(`Hello ${this.user.name}`)
  }
}
```

## Queue Connection

```typescript
await Mail
  .mailer('smtp')
  .queue(new WelcomeMail(user))
```

## Next Steps

- [Mailables](/packages/mail/mailables) -- Building emails
- [Queue](/packages/queue) -- Queue system
- [Mail Drivers](/packages/mail/drivers) -- Mail drivers
