---
name: @lara-node/mail — Multi-Driver Email System
description: >-
  Email system with SMTP, Log, Array, and Failover drivers. Fluent Mailable classes,
  queue support, HTML/text templates. Activates for questions about Mail facade,
  MailManager, Mailable class, sendMail(), or queueMail().
---

# @lara-node/mail

Multi-driver email system (SMTP, Log, Array, Failover) with fluent Mailable classes.

## Key Exports

| Export | Description |
|--------|-------------|
| `Mail` | Mail facade |
| `MailManager` | Mail driver manager |
| `Mailer` | Fluent mailer |
| `Mailable` | Base mailable class |
| `sendMail(mailable)` | Send helper |
| `queueMail(mailable)` | Queue helper |

## Quick Start

```typescript
import { Mailable } from "@lara-node/mail";

class WelcomeMail extends Mailable {
  constructor(private user: User) { super(); }

  build() {
    return this.to(this.user.email)
      .subject("Welcome to LaraNode!")
      .view("emails.welcome", { user: this.user });
  }
}

// Send
import { Mail } from "@lara-node/mail";
await Mail.to("user@example.com").send(new WelcomeMail(user));
```
