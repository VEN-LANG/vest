# @lara-node/mail

Multi-driver mailer (SMTP, log, array, failover) with a Mailable base class, queued mail, and full TypeScript types.

## Installation

```sh
pnpm add @lara-node/mail
```

## Quick Start

```ts
import { Mail } from '@lara-node/mail';
import { WelcomeMail } from './app/Mail/WelcomeMail';

// Send immediately
await Mail.to('alice@example.com').send(new WelcomeMail(user));

// Queue for background delivery
await Mail.to('alice@example.com').queue(new WelcomeMail(user));

// Schedule for later
await Mail.to('alice@example.com').later(new WelcomeMail(user), 300); // 5 min delay
```

## Creating a Mailable

Extend the `Mailable` base class and implement `build()`:

```ts
import { Mailable } from '@lara-node/mail';

interface User {
  name: string;
  email: string;
}

export class WelcomeMail extends Mailable {
  constructor(private readonly user: User) {
    super();
  }

  build(): this {
    return this
      .subject(`Welcome, ${this.user.name}!`)
      .from('hello@example.com', 'My App')
      .html(`<h1>Hello ${this.user.name}</h1><p>Thanks for signing up.</p>`)
      .text(`Hello ${this.user.name}. Thanks for signing up.`);
  }
}
```

### Mailable fluent methods

All methods return `this` for chaining and must be called inside `build()`.

```ts
this.subject('Your order has shipped')
this.from('noreply@example.com')
this.from('noreply@example.com', 'My App')
this.html('<p>Hello</p>')
this.text('Hello')
this.attach('/path/to/invoice.pdf')
this.attach('/path/to/file.csv', { filename: 'report.csv', contentType: 'text/csv' })
this.cc('manager@example.com')
this.bcc('archive@example.com')
this.replyTo('support@example.com')
this.priority('high')          // 'high' | 'normal' | 'low'
this.tag('transactional')      // tag for analytics / filtering
this.mailer('smtp')            // override the default mailer for this message
this.with({ code: '123456' })  // pass data to the template (if using a view engine)
```

## `Mail` Facade

### `Mail.to(address)`

Returns a `PendingMail` builder.

```ts
Mail.to('alice@example.com')
Mail.to(['alice@example.com', 'bob@example.com'])
Mail.to({ address: 'alice@example.com', name: 'Alice' })
```

### `PendingMail` methods

```ts
await pending.send(mailable)              // send synchronously
await pending.queue(mailable)             // dispatch to queue
await pending.later(mailable, delaySeconds) // dispatch after a delay
```

### Sending to multiple recipients

```ts
const users = await User.all();

for (const user of users) {
  await Mail.to(user.email).queue(new NewsletterMail(user));
}
```

## Multiple Mailers

Configure multiple mailers in `config/mail.ts`:

```ts
import { setConfig } from '@lara-node/core';

setConfig('mail', {
  default: 'smtp',
  mailers: {
    smtp: {
      transport: 'smtp',
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT ?? 587),
      username: process.env.MAIL_USERNAME,
      password: process.env.MAIL_PASSWORD,
      encryption: process.env.MAIL_ENCRYPTION ?? 'tls',
    },
    log: {
      transport: 'log',
    },
    failover: {
      transport: 'failover',
      mailers: ['smtp', 'log'],
    },
  },
  from: {
    address: process.env.MAIL_FROM_ADDRESS ?? 'hello@example.com',
    name: process.env.MAIL_FROM_NAME ?? 'My App',
  },
});
```

Override the mailer for a single message:

```ts
this.mailer('log');  // inside build()
```

## `MailServiceProvider`

```ts
import { MailServiceProvider } from '@lara-node/mail';

app.register(MailServiceProvider);
```

## Environment Variables

| Variable               | Default    | Description                                                |
|------------------------|------------|------------------------------------------------------------|
| `MAIL_MAILER`          | `smtp`     | Default mailer name                                        |
| `MAIL_HOST`            | —          | SMTP host                                                  |
| `MAIL_PORT`            | `1025`     | SMTP port                                                  |
| `MAIL_USERNAME`        | —          | SMTP username                                              |
| `MAIL_PASSWORD`        | —          | SMTP password                                              |
| `MAIL_ENCRYPTION`      | —          | `tls`, `ssl`, or empty                                     |
| `MAIL_FROM_ADDRESS`    | —          | Default sender address                                     |
| `MAIL_FROM_NAME`       | —          | Default sender display name                                |
| `MAIL_FAILOVER_MAILERS`| —          | Comma-separated mailers for the failover driver            |

## Notes

- The `log` driver writes mail content to the application log rather than sending — useful during development.
- The `array` driver stores sent messages in memory and exposes them for inspection in tests.
- Queued mail requires a configured queue connection. See `@lara-node/queue`.
- `attach()` resolves paths relative to `process.cwd()`.
