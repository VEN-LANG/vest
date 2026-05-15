/*
|--------------------------------------------------------------------------
| Broadcast Events
|--------------------------------------------------------------------------
|
| Example broadcastable events for the application.
|
*/

import { Event } from "@vest-ts/events";
import { ShouldBroadcast, BroadcastAs } from "@vest-ts/events";

/**
 * Event broadcast when a new notification is created.
 */
@ShouldBroadcast()
@BroadcastAs("notification.created")
export class NotificationCreatedEvent extends Event {
  constructor(
    public userId: number,
    public notification: {
      id: number;
      title: string;
      message: string;
      type: string;
      createdAt: Date;
    },
  ) {
    super();
  }

  eventName(): string {
    return "notification.created";
  }

  broadcastOn(): string[] {
    return [`private-notifications.${this.userId}`];
  }

  broadcastWith(): Record<string, any> {
    return {
      id: this.notification.id,
      title: this.notification.title,
      message: this.notification.message,
      type: this.notification.type,
      createdAt: this.notification.createdAt,
    };
  }
}

/**
 * Event broadcast for system-wide announcements.
 */
@ShouldBroadcast()
@BroadcastAs("announcement")
export class AnnouncementEvent extends Event {
  constructor(
    public title: string,
    public message: string,
    public type: "info" | "warning" | "success" | "error" = "info",
  ) {
    super();
  }

  eventName(): string {
    return "announcement";
  }

  broadcastOn(): string[] {
    return ["announcements"];
  }

  broadcastWith(): Record<string, any> {
    return {
      title: this.title,
      message: this.message,
      type: this.type,
      timestamp: new Date(),
    };
  }
}

/**
 * Event broadcast when a user joins a presence channel.
 */
@ShouldBroadcast()
@BroadcastAs("user.joined")
export class UserJoinedEvent extends Event {
  constructor(
    public channelName: string,
    public user: {
      id: number;
      name: string;
      avatar?: string;
    },
  ) {
    super();
  }

  eventName(): string {
    return "user.joined";
  }

  broadcastOn(): string[] {
    return [this.channelName];
  }

  broadcastWith(): Record<string, any> {
    return {
      user: this.user,
      joinedAt: new Date(),
    };
  }
}
