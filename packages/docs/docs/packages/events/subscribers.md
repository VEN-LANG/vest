# Event Subscribers

Subscribers group multiple related listeners in a single class.

## Creating Subscribers

```typescript
import { Subscriber } from '@lara-node/events'

@Subscriber()
class UserEventSubscriber {
  async onUserRegistered(event: UserRegistered) {
    await Mail.to(event.user.email).send(new WelcomeMail(event.user))
  }

  async onUserUpdated(event: UserUpdated) {
    await Cache.del(`user:${event.user.id}`)
  }

  async onUserDeleted(event: UserDeleted) {
    await Cache.del(`user:${event.user.id}`)
  }
}
```

## Subscribing

```typescript
import { EventDispatcher } from '@lara-node/events'

const dispatcher = new EventDispatcher()
dispatcher.subscribe(UserEventSubscriber)
```

## Event Method Naming

Methods follow the pattern `on<EventName>`:

```typescript
onUserRegistered(event: UserRegistered)
onUserUpdated(event: UserUpdated)
onUserDeleted(event: UserDeleted)
```

## Complete Example

```typescript
@Subscriber()
class OrderEventSubscriber {
  async onOrderCreated(event: OrderCreated) {
    await Mail.to(event.order.user.email).send(new OrderConfirmationMail(event.order))
  }

  async onOrderPaid(event: OrderPaid) {
    await event.order.update({ status: 'paid' })
  }

  async onOrderShipped(event: OrderShipped) {
    await Notification.send(event.order.user, 'Your order has been shipped!')
  }

  async onOrderCancelled(event: OrderCancelled) {
    await event.order.update({ status: 'cancelled' })
  }
}
```

## Next Steps

- [Listeners](/packages/events/listeners) -- Event listeners
- [Queueable Listeners](/packages/events/queueable) -- Queue-backed listeners
- [Broadcasting](/packages/events/broadcasting) -- WebSocket broadcasting
