import { Event } from '@lara-node/events';

export class UserNotification extends Event {
  constructor(
    public userId: string | number,
    public message: string,
    public type: string = 'info',
  ) { super(); }
  eventName() { return 'user.notification'; }
  broadcastOn() { return [`notifications.${this.userId}`]; }
}
