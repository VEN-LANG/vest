# Mailables

Mailable classes provide a fluent way to build emails.

## Creating Mailables

```typescript
import { Mailable } from '@lara-node/mail'

class WelcomeMail extends Mailable {
  constructor(private user: User) {
    super()
  }

  build() {
    return this
      .to(this.user.email, this.user.name)
      .subject('Welcome to LaraNode!')
      .from('hello@laranode.dev', 'LaraNode Team')
      .text(`Hello ${this.user.name}, welcome!`)
  }
}
```

## Fluent Methods

```typescript
class OrderConfirmationMail extends Mailable {
  build() {
    return this
      .to(this.order.user.email)
      .cc('admin@example.com')
      .bcc('archive@example.com')
      .replyTo('support@example.com')
      .from('orders@example.com', 'Orders')
      .subject(`Order #${this.order.id} Confirmed`)
      .text('Your order has been confirmed')
      .html('<h1>Order Confirmed</h1>')
      .view('emails.order-confirmation', { order: this.order })
      .attach('/path/to/invoice.pdf')
      .header('X-Custom-Header', 'value')
      .priority('high')
      .tag('order')
  }
}
```

## Simple Mailables

```typescript
import { TextMailable, HtmlMailable } from '@lara-node/mail'

// Text only
const mail = new TextMailable('user@example.com', 'Subject', 'Body text')

// HTML only
const mail = new HtmlMailable('user@example.com', 'Subject', '<h1>Hello</h1>')
```

## Attachments

```typescript
.build() {
  return this
    .to(this.user.email)
    .subject('Your Report')
    .attach('/path/to/report.pdf')
    .attach('/path/to/invoice.pdf', { as: 'invoice.pdf' })
}
```

## Next Steps

- [Mail Overview](/packages/mail) -- Mail overview
- [Mail Drivers](/packages/mail/drivers) -- SMTP, Log, Array
- [Queued Mail](/packages/mail/queued) -- Queue emails
