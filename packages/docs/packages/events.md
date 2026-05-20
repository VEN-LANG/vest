# Events Package

The `@lara-node/events` package provides an event dispatcher with listeners, subscribers, and WebSocket broadcasting.

## Installation

```bash
pnpm add @lara-node/events @lara-node/core reflect-metadata
```

## Overview

Features include:

- **Event dispatcher** with publish/subscribe
- **Listeners** with decorators
- **Event subscribers** for grouping
- **Queueable listeners**
- **Transaction-aware** events
- **WebSocket broadcasting**
- **Channel types** (public, private, presence)

## Quick Start

### Define an Event

```typescript
class UserRegistered {
  constructor(public user: User) {}
}
```

### Define a Listener

```typescript
import { ListensTo } from "@lara-node/events";

@ListensTo(UserRegistered)
class SendWelcomeEmail {
  async handle(event: UserRegistered) {
    await Mail.to(event.user.email).send(new WelcomeMail(event.user));
  }
}
```

### Dispatch an Event

```typescript
import { event } from "@lara-node/events";

await event(new UserRegistered(user));
```

## Key Exports

| Export            | Description                |
| ----------------- | -------------------------- |
| `EventDispatcher` | Event dispatcher           |
| `event()`         | Dispatch helper            |
| `on()`            | Register listener          |
| `once()`          | Register one-time listener |
| `off()`           | Remove listener            |
| `@ListensTo()`    | Listener decorator         |
| `@ShouldQueue`    | Queue listener             |
| `@AfterCommit`    | After transaction          |
| `@Subscriber`     | Subscriber decorator       |
| `Broadcast`       | Broadcast facade           |
| `Channel`         | Channel types              |

## Next Steps

- [Listeners](/packages/events/listeners) -- Event listeners
- [Subscribers](/packages/events/subscribers) -- Event subscribers
- [Broadcasting](/packages/events/broadcasting) -- WebSocket broadcasting
