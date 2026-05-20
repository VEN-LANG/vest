# Event Listeners

Listeners handle events when they are dispatched.

## Creating Listeners

```typescript
import { ListensTo } from '@lara-node/events'

@ListensTo(UserRegistered)
class SendWelcomeEmail {
  async handle(event: UserRegistered) {
    await Mail.to(event.user.email).send(new WelcomeMail(event.user))
  }
}
```

## Multiple Listeners

Multiple listeners can listen to the same event:

```typescript
@ListensTo(UserRegistered)
class SendWelcomeEmail {
  async handle(event: UserRegistered) {
    // Send email
  }
}

@ListensTo(UserRegistered)
class NotifyAdmin {
  async handle(event: UserRegistered) {
    // Notify admin
  }
}
```

## Listening to Multiple Events

```typescript
@ListensTo(UserRegistered)
@ListensTo(UserUpdated)
class UpdateSearchIndex {
  async handle(event: UserRegistered | UserUpdated) {
    // Update search index
  }
}
```

## Registering Listeners Manually

```typescript
import { on, event } from '@lara-node/events'

on(UserRegistered, async (event) => {
  console.log('User registered:', event.user.email)
})

// Dispatch
await event(new UserRegistered(user))
```

## Once Listeners

```typescript
import { once } from '@lara-node/events'

once(AppStarted, async () => {
  console.log('This runs only once')
})
```

## Removing Listeners

```typescript
import { off } from '@lara-node/events'

off(UserRegistered, listenerFunction)
```

## Event Naming

Customize event names:

```typescript
import { EventName } from '@lara-node/events'

@EventName('user.registered')
class UserRegistered {
  constructor(public user: User) {}
}
```

## Next Steps

- [Subscribers](/packages/events/subscribers) -- Event subscribers
- [Queueable Listeners](/packages/events/queueable) -- Queue-backed listeners
- [Broadcasting](/packages/events/broadcasting) -- WebSocket broadcasting
