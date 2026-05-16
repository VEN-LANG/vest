import { Event } from '@lara-node/events';

export class UserRegistered extends Event {
  constructor(
    public readonly userId: string | number,
    public readonly email: string,
    public readonly name: string,
  ) { super(); }
  eventName() { return 'user.registered'; }
}

export class UserLoggedIn extends Event {
  constructor(
    public readonly userId: string | number,
    public readonly email: string,
    public readonly ipAddress?: string,
  ) { super(); }
  eventName() { return 'user.logged_in'; }
}

export class UserLoggedOut extends Event {
  constructor(public readonly userId: string | number) { super(); }
  eventName() { return 'user.logged_out'; }
}
