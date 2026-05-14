/*
|--------------------------------------------------------------------------
| Broadcast Decorators
|--------------------------------------------------------------------------
|
| Decorators for marking events as broadcastable.
|
*/

import { Channel, PrivateChannel, PresenceChannel, PublicChannel } from "./Channel.js";

/**
 * Mark an event class as broadcastable.
 *
 * @example
 * @ShouldBroadcast(['chat-room.1', 'private-user.{userId}'])
 * export class MessageSentEvent extends Event {
 *     constructor(public message: Message) {
 *         super();
 *     }
 * }
 */
export function ShouldBroadcast(
  channels?: string | string[] | (() => string | string[]),
): ClassDecorator {
  return function (target: Function) {
    const originalBroadcastOn = target.prototype.broadcastOn;

    target.prototype.broadcastOn = function () {
      if (channels) {
        return typeof channels === "function" ? channels.call(this) : channels;
      }
      if (originalBroadcastOn) {
        return originalBroadcastOn.call(this);
      }
      return [];
    };

    // Mark as broadcastable

    (target as any).__shouldBroadcast = true;
  };
}

/**
 * Mark an event to broadcast only to others (exclude sender).
 */
export function BroadcastToOthers(): ClassDecorator {
  return function (target: Function) {
    (target as any).__broadcastToOthers = true;
  };
}

/**
 * Set the broadcast event name.
 *
 * @example
 * @ShouldBroadcast(['chat'])
 * @BroadcastAs('message.sent')
 * export class MessageSentEvent extends Event {}
 */
export function BroadcastAs(name: string): ClassDecorator {
  return function (target: Function) {
    target.prototype.broadcastAs = function () {
      return name;
    };
  };
}

/**
 * Conditionally broadcast based on a condition.
 *
 * @example
 * @ShouldBroadcast(['notifications'])
 * @BroadcastWhen((event) => event.user.notificationsEnabled)
 * export class NotificationEvent extends Event {}
 */
export function BroadcastWhen(condition: (event: any) => boolean): ClassDecorator {
  return function (target: Function) {
    target.prototype.broadcastWhen = function () {
      return condition(this);
    };
  };
}

/**
 * Specify the data to broadcast.
 *
 * @example
 * @ShouldBroadcast(['chat'])
 * @BroadcastWith((event) => ({ messageId: event.message.id, content: event.message.content }))
 * export class MessageSentEvent extends Event {}
 */
export function BroadcastWith(dataFn: (event: any) => Record<string, any>): ClassDecorator {
  return function (target: Function) {
    target.prototype.broadcastWith = function () {
      return dataFn(this);
    };
  };
}

/**
 * Helper to check if a class is marked as broadcastable.
 */
export function isBroadcastable(target: any): boolean {
  return target?.__shouldBroadcast === true || target?.constructor?.__shouldBroadcast === true;
}

/**
 * Helper to check if broadcast should exclude sender.
 */
export function shouldBroadcastToOthers(target: any): boolean {
  return target?.__broadcastToOthers === true || target?.constructor?.__broadcastToOthers === true;
}
