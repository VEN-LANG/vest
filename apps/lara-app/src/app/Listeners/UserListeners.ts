import { Listener, ListensTo } from '@lara-node/events';
import { UserRegistered, UserLoggedIn } from '../Events/UserEvents';

@ListensTo('user.registered')
export class SendWelcomeEmail extends Listener<UserRegistered> {
  async handle(payload: UserRegistered): Promise<void> {
    console.log(`[SendWelcomeEmail] Sending welcome email to ${payload.email}`);
  }
}

@ListensTo('user.logged_in')
export class LogUserLogin extends Listener<UserLoggedIn> {
  async handle(payload: UserLoggedIn): Promise<void> {
    console.log(`[LogUserLogin] User ${payload.userId} logged in${payload.ipAddress ? ` from ${payload.ipAddress}` : ''}`);
  }
}
