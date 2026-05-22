import { Event } from '@lara-node/events';

export class UserRegistered extends Event {
  constructor(public userId: string | number, public email: string, public name: string) { super(); }
  eventName() { return 'user.registered'; }
}

export class UserLoggedIn extends Event {
  constructor(public userId: string | number, public email: string, public ipAddress?: string) { super(); }
  eventName() { return 'user.logged_in'; }
}

export class UserLoggedOut extends Event {
  constructor(public userId: string | number) { super(); }
  eventName() { return 'user.logged_out'; }
}

export class PasswordResetRequested extends Event {
  constructor(public userId: string | number, public email: string, public token: string) { super(); }
  eventName() { return 'password.reset_requested'; }
}
