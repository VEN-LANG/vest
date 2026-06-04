import { BroadcastServiceProvider as BaseProvider } from '@lara-node/events';
import { Broadcast } from '@lara-node/events';

/*
|--------------------------------------------------------------------------
| BroadcastServiceProvider
|--------------------------------------------------------------------------
|
| Extends the framework BroadcastServiceProvider.
| Define your channel authorization rules here.
|
*/
export class BroadcastServiceProvider extends BaseProvider {
  protected override channels(): void {
    Broadcast.private('notifications.{userId}', (user: Record<string, unknown> | null, userId: string) => {
      return !!user && String(user['id']) === userId;
    });
    Broadcast.private('user.{userId}', (user: Record<string, unknown> | null, userId: string) => {
      return !!user && String(user['id']) === userId;
    });
    Broadcast.public('announcements');
  }
}
