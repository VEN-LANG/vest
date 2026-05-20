# Broadcasting

Broadcast events to clients via WebSockets.

## Channel Types

```typescript
import { PublicChannel, PrivateChannel, PresenceChannel } from '@lara-node/events'

// Public channel (anyone can listen)
new PublicChannel('chat')

// Private channel (requires auth)
new PrivateChannel(`user.${userId}`)

// Presence channel (tracks who is online)
new PresenceChannel(`room.${roomId}`)
```

## Broadcasting Events

```typescript
import { ShouldBroadcast, BroadcastAs, BroadcastToOthers } from '@lara-node/events'

@ShouldBroadcast()
class MessageSent {
  constructor(public message: Message) {}

  broadcastOn() {
    return new PrivateChannel(`chat.${this.message.roomId}`)
  }
}
```

## Broadcast Decorators

```typescript
@ShouldBroadcast()
@BroadcastAs('new-message')
@BroadcastToOthers()
class MessageSent {
  broadcastOn() {
    return new Channel('chat')
  }

  broadcastWith() {
    return {
      id: this.message.id,
      text: this.message.text,
      user: this.message.user.name,
    }
  }
}
```

## Broadcast Conditions

```typescript
@ShouldBroadcast()
class OrderStatusChanged {
  broadcastWhen() {
    return this.order.status === 'shipped'
  }
}
```

## Broadcast Facade

```typescript
import { Broadcast } from '@lara-node/events'

Broadcast.channel('chat').emit('message', data)
Broadcast.toOthers().channel('chat').emit('message', data)
```

## Configuration

```dotenv
BROADCAST_DRIVER=websocket
```

## Next Steps

- [Listeners](/packages/events/listeners) -- Event listeners
- [Queue](/packages/queue) -- Queue system
- [Horizon](/packages/horizon) -- Queue monitoring
