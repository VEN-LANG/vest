# @lara-node/events

Event dispatcher, listener decorators, queued listeners, event subscribers, and WebSocket/Pusher broadcasting.

## Installation

```sh
pnpm add @lara-node/events
```

## Quick Start

```ts
import { event, on } from '@lara-node/events';

on('user.registered', async (payload) => {
  await sendWelcomeEmail(payload.user);
});

// Fire the event
await event('user.registered', { user });
```

## Events API

### `event(name, payload?)`

Fire a named event. All registered listeners execute in registration order.

```ts
import { event } from '@lara-node/events';

await event('order.placed', { orderId: 42, total: 99.99 });
await event('cache.cleared');
```

### `on(name, handler)` / `once(name, handler)` / `off(name, handler)`

Register and remove listeners inline.

```ts
import { on, once, off } from '@lara-node/events';

const handler = async (payload) => {
  console.log('Received:', payload);
};

on('payment.failed', handler);
once('app.boot', () => console.log('App booted'));
off('payment.failed', handler);
```

### `EventDispatcher`

Full dispatcher class with queued and subscriber support.

```ts
import { EventDispatcher } from '@lara-node/events';

const dispatcher = new EventDispatcher();

// Register a listener
dispatcher.listen('user.created', async (payload) => {
  await sendEmail(payload.email);
});

// Register a queued listener (dispatches as a job)
dispatcher.listenQueued('report.generated', ReportMailListener);

// Subscribe a class
dispatcher.subscribe(UserEventSubscriber);

// Fire synchronously (ignores any @ShouldQueue settings)
await dispatcher.dispatchNow('user.created', { email: 'alice@example.com' });
```

### `@ListensTo('event.name')`

Decorator that registers a class as a listener for a named event. The class must implement `handle(payload)`.

```ts
import { ListensTo } from '@lara-node/events';

@ListensTo('user.registered')
export class SendWelcomeEmail {
  async handle(payload: { user: User }) {
    await mailer.send(new WelcomeMail(payload.user));
  }
}
```

### `@ShouldQueue`

Makes a listener execute via the job queue instead of synchronously.

```ts
import { ListensTo, ShouldQueue } from '@lara-node/events';

@ListensTo('report.generated')
@ShouldQueue
export class SendReportEmail {
  queue = 'notifications';
  tries = 3;

  async handle(payload: { reportId: number }) {
    await mailer.send(new ReportMail(payload.reportId));
  }
}
```

### `@AfterCommit`

Delays event dispatch until after the active database transaction commits. Has no effect outside a transaction.

```ts
import { ListensTo, AfterCommit } from '@lara-node/events';

@ListensTo('order.placed')
@AfterCommit
export class NotifyWarehouse {
  async handle(payload: { orderId: number }) {
    await warehouseApi.notifyNewOrder(payload.orderId);
  }
}
```

### `@Subscriber`

Marks a class as an event subscriber. The class must implement `subscribe(dispatcher)`.

```ts
import { Subscriber } from '@lara-node/events';

@Subscriber
export class UserEventSubscriber {
  subscribe(dispatcher: EventDispatcher) {
    dispatcher.listen('user.login', this.onLogin.bind(this));
    dispatcher.listen('user.logout', this.onLogout.bind(this));
  }

  async onLogin(payload: { userId: number }) {
    await updateLastSeen(payload.userId);
  }

  async onLogout(payload: { userId: number }) {
    await invalidateSessions(payload.userId);
  }
}
```

### `EventServiceProvider`

Extend to declare your event-listener map and enable listener auto-discovery.

```ts
import { EventServiceProvider } from '@lara-node/events';

export class AppEventServiceProvider extends EventServiceProvider {
  protected listen: Record<string, unknown[]> = {
    'user.registered': [SendWelcomeEmail, LogRegistration],
    'order.placed':    [NotifyWarehouse, SendOrderConfirmation],
  };

  // Optional: auto-discover listeners in a directory
  protected discoverListeners(): string[] {
    return ['src/Listeners'];
  }
}
```

Register it in your application:

```ts
app.register(AppEventServiceProvider);
```

## Broadcasting API

### `broadcast(channel, event, data)`

Broadcast data to a named channel.

```ts
import { broadcast } from '@lara-node/events';

await broadcast('orders', 'OrderShipped', { orderId: 42 });
```

### `Broadcast` facade

```ts
import { Broadcast } from '@lara-node/events';

await Broadcast.channel('notifications').emit('NewMessage', { text: 'Hello' });
await Broadcast.private('orders.42', authCallback).emit('OrderUpdated', { status: 'shipped' });
await Broadcast.presence('chat.room.1', authCallback).emit('UserJoined', { userId: 99 });
```

### Broadcasting decorators

```ts
import { ShouldBroadcast, BroadcastOn, BroadcastAs, BroadcastWith, BroadcastWhen } from '@lara-node/events';

@ShouldBroadcast
@BroadcastOn('orders')
@BroadcastAs('OrderShipped')
@BroadcastWith((payload) => ({ orderId: payload.id, status: payload.status }))
@BroadcastWhen((payload) => payload.notifyCustomer === true)
export class OrderShippedEvent {
  constructor(public readonly order: Order) {}
}
```

### `BroadcastServiceProvider`

Extend and override `channels()` to define channel authorization callbacks.

```ts
import { BroadcastServiceProvider } from '@lara-node/events';

export class AppBroadcastServiceProvider extends BroadcastServiceProvider {
  protected channels() {
    return {
      'orders.{orderId}': (user: User, orderId: string) => {
        return user.id === Order.find(Number(orderId))?.userId;
      },
      'chat.room.{roomId}': async (user: User, roomId: string) => {
        return ChatRoom.where('id', roomId).where('members', 'contains', user.id).exists();
      },
    };
  }
}
```

## Environment Variables

| Variable               | Default | Description                                      |
|------------------------|---------|--------------------------------------------------|
| `BROADCAST_DRIVER`     | `null`  | Driver: `pusher`, `ably`, `socketio`, or `null`  |
| `PUSHER_APP_ID`        | —       | Pusher application ID                            |
| `PUSHER_APP_KEY`       | —       | Pusher application key                           |
| `PUSHER_APP_SECRET`    | —       | Pusher application secret                        |
| `PUSHER_APP_CLUSTER`   | —       | Pusher cluster (e.g. `mt1`, `eu`)                |
| `ABLY_KEY`             | —       | Ably API key (used when driver is `ably`)         |

## Notes

- The `null` broadcast driver silently drops all broadcasts — useful during development when real-time infra is not running.
- Queued listeners require a configured queue connection (`QUEUE_CONNECTION`). See `@lara-node/queue`.
- `@AfterCommit` is a no-op if `@lara-node/db` is not in use or no transaction is active.
