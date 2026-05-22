import { EventDispatcher, EventSubscriber, Subscriber } from '@lara-node/events';

@Subscriber()
export class UserEventSubscriber implements EventSubscriber {
  subscribe(dispatcher: EventDispatcher): void {
    dispatcher.listen('user.registered', this.handleUserRegistered.bind(this));
    dispatcher.listen('user.logged_in', this.handleUserLoggedIn.bind(this));
    dispatcher.listen('user.logged_out', this.handleUserLoggedOut.bind(this));
    dispatcher.listen('user.*', this.handleAnyUserEvent.bind(this));
  }

  async handleUserRegistered(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User registered:', payload['email']);
  }

  async handleUserLoggedIn(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User logged in:', payload['email']);
  }

  async handleUserLoggedOut(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User logged out:', payload['userId']);
  }

  async handleAnyUserEvent(payload: Record<string, unknown>): Promise<void> {
    console.log('[UserEventSubscriber] User event:', payload);
  }
}
