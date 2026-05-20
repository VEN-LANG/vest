# Queueable Listeners

Run listeners asynchronously via the queue system.

## Making a Listener Queueable

```typescript
import { ListensTo, ShouldQueue } from '@lara-node/events'

@ListensTo(UserRegistered)
@ShouldQueue()
class SendWelcomeEmail {
  async handle(event: UserRegistered) {
    await Mail.to(event.user.email).send(new WelcomeMail(event.user))
  }
}
```

## Queue Options

```typescript
@ShouldQueue({
  queue: 'emails',
  connection: 'redis',
  tries: 3,
  timeout: 60,
})
class SendWelcomeEmail {
  // ...
}
```

## After Commit

Run listener after database transaction commits:

```typescript
import { ListensTo, ShouldQueue, AfterCommit } from '@lara-node/events'

@ListensTo(OrderCreated)
@ShouldQueue()
@AfterCommit()
class SendOrderConfirmation {
  async handle(event: OrderCreated) {
    // Only runs after transaction commits
    await Mail.to(event.order.user.email).send(new OrderConfirmationMail(event.order))
  }
}
```

## QueueableListener Base

```typescript
import { QueueableListener } from '@lara-node/events'

class SendWelcomeEmail extends QueueableListener {
  async handle(event: UserRegistered) {
    // Queueable by default
  }
}
```

## Next Steps

- [Listeners](/packages/events/listeners) -- Event listeners
- [Subscribers](/packages/events/subscribers) -- Event subscribers
- [Broadcasting](/packages/events/broadcasting) -- WebSocket broadcasting
