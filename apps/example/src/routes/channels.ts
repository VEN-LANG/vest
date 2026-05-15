/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

import { Broadcast } from "@vest-ts/events";

/*
|--------------------------------------------------------------------------
| User Channels
|--------------------------------------------------------------------------
*/

/**
 * Private channel for user-specific notifications.
 * Only the user themselves can subscribe.
 */
Broadcast.private("notifications.{userId}", (user, userId) => {
  return user && user.id === parseInt(userId);
});

/**
 * Private channel for user-specific updates.
 */
Broadcast.private("user.{userId}", (user, userId) => {
  return user && user.id === parseInt(userId);
});

/*
|--------------------------------------------------------------------------
| Admin Channels
|--------------------------------------------------------------------------
*/

/**
 * Private channel for admin dashboard updates.
 */
Broadcast.private("admin.dashboard", (user) => {
  return user && (user.role === "admin" || user.role === "super_admin");
});

/**
 * Private channel for admin notifications.
 */
Broadcast.private("admin.notifications", (user) => {
  return user && (user.role === "admin" || user.role === "super_admin");
});

/*
|--------------------------------------------------------------------------
| Public Channels
|--------------------------------------------------------------------------
*/

/**
 * Public channel for system-wide announcements.
 */
Broadcast.public("announcements");

/**
 * Public channel for general notifications.
 */
Broadcast.public("general");

/*
|--------------------------------------------------------------------------
| Presence Channels
|--------------------------------------------------------------------------
*/

/**
 * Presence channel for tracking online users.
 */
Broadcast.presence("online", (user) => {
  if (!user) return false;
  return {
    id: user.id,
    name: user.name || user.email,
    role: user.role,
  };
});
