/*
|--------------------------------------------------------------------------
| User Event Subscriber
|--------------------------------------------------------------------------
|
| Event Subscribers allow you to subscribe to multiple events from within
| a single class. Instead of registering each listener individually, you
| can group related event handlers together.
|
| Use the @Subscriber decorator for automatic discovery.
|
*/

import { EventDispatcher, EventSubscriber } from "@lara-node/events";
import { Subscriber } from "@lara-node/events";

@Subscriber()
export class UserEventSubscriber implements EventSubscriber {
  /**
   * Register the listeners for the subscriber.
   */
  subscribe(dispatcher: EventDispatcher): void {
    dispatcher.listen("user.registered", this.handleUserRegistered.bind(this));
    dispatcher.listen("user.logged_in", this.handleUserLoggedIn.bind(this));
    dispatcher.listen("user.logged_out", this.handleUserLoggedOut.bind(this));
    dispatcher.listen("user.password_reset", this.handlePasswordReset.bind(this));
    dispatcher.listen("user.email_verified", this.handleEmailVerified.bind(this));

    // Wildcard listener for all user events
    dispatcher.listen("user.*", this.handleAnyUserEvent.bind(this));
  }

  /**
   * Handle user registered events.
   */
  async handleUserRegistered(payload: any): Promise<void> {
    console.log("[UserEventSubscriber] User registered:", payload.email);
    // Track analytics, sync to CRM, etc.
  }

  /**
   * Handle user logged in events.
   */
  async handleUserLoggedIn(payload: any): Promise<void> {
    console.log("[UserEventSubscriber] User logged in:", payload.email);
    // Update last login timestamp, track session, etc.
  }

  /**
   * Handle user logged out events.
   */
  async handleUserLoggedOut(payload: any): Promise<void> {
    console.log("[UserEventSubscriber] User logged out:", payload.userId);
    // Clean up session data, etc.
  }

  /**
   * Handle password reset events.
   */
  async handlePasswordReset(payload: any): Promise<void> {
    console.log("[UserEventSubscriber] Password reset:", payload.email);
    // Send notification, log security event, etc.
  }

  /**
   * Handle email verified events.
   */
  async handleEmailVerified(payload: any): Promise<void> {
    console.log("[UserEventSubscriber] Email verified:", payload.email);
    // Enable full account features, etc.
  }

  /**
   * Handle any user event (wildcard).
   */
  async handleAnyUserEvent(payload: any): Promise<void> {
    // Log all user events for audit purposes
    console.log("[UserEventSubscriber] User event occurred:", payload);
  }
}
