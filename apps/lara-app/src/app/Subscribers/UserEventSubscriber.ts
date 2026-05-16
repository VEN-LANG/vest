import { EventDispatcher, EventSubscriber, Subscriber } from '@lara-node/events';

@Subscriber()
export class UserEventSubscriber implements EventSubscriber {
  subscribe(dispatcher: EventDispatcher): void {
    dispatcher.listen('user.registered', this.onRegistered.bind(this));
    dispatcher.listen('user.logged_in', this.onLogin.bind(this));
    dispatcher.listen('user.logged_out', this.onLogout.bind(this));
    dispatcher.listen('user.*', this.onAnyUserEvent.bind(this));
  }

  async onRegistered(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User registered:', payload['email']);
  }

  async onLogin(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User logged in:', payload['email']);
  }

  async onLogout(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User logged out:', payload['userId']);
  }

  async onAnyUserEvent(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User event:', JSON.stringify(payload));
  }
}
