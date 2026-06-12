---
name: events
description: >-
  Publish/subscribe event system with listeners, subscribers, queueable listeners,
  transaction-aware events, and WebSocket broadcasting (public/private/presence channels).
  Activates for questions about event(), on(), off(), once(), @ListensTo(), @ShouldQueue,
  @Subscriber, or Broadcast facade.
---

# @lara-node/events

Event dispatcher with listeners, subscribers, and WebSocket broadcasting.

## Key Exports

| Export | Description |
|--------|-------------|
| `EventDispatcher` | Event dispatcher |
| `event()` | Dispatch helper |
| `on()` | Register listener |
| `once()` | Register one-time listener |
| `off()` | Remove listener |
| `@ListensTo()` | Listener decorator |
| `@ShouldQueue` | Queue listener decorator |
| `@AfterCommit` | After transaction decorator |
| `@Subscriber` | Subscriber decorator |
| `Broadcast` | Broadcast facade |
| `Channel` | Channel types (public, private, presence) |

## Quick Start

```typescript
class UserRegistered {
  constructor(public user: User) {}
}

import { ListensTo } from "@lara-node/events";

@ListensTo(UserRegistered)
class SendWelcomeEmail {
  async handle(event: UserRegistered) {
    await Mail.to(event.user.email).send(new WelcomeMail(event.user));
  }
}

// Dispatch
import { event } from "@lara-node/events";
await event(new UserRegistered(user));
```

## Broadcasting

```typescript
import { Broadcast, Channel } from "@lara-node/events";

// Public channel
Broadcast.channel("orders").emit("order.shipped", { orderId: 1 });

// Private channel
Broadcast.private("user.1").emit("notification", { text: "Order shipped!" });
```
