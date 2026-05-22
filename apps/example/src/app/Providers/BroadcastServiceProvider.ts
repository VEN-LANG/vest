import { ServiceProvider } from '@lara-node/core';
import { Broadcast } from '@lara-node/events';

export class BroadcastServiceProvider extends ServiceProvider {
  register(): void {}

  async boot(): Promise<void> {
    Broadcast.private('notifications.{userId}', (user: Record<string, unknown> | null, userId: string) => {
      return !!user && String(user['id']) === userId;
    });
    Broadcast.private('user.{userId}', (user: Record<string, unknown> | null, userId: string) => {
      return !!user && String(user['id']) === userId;
    });
    Broadcast.public('announcements');
  }
}
