import { ServiceProvider, setConfig } from '@lara-node/core';
import appConfig from '../../config/app.config';
import dbConfig from '../../config/db.config';
import mailConfig from '../../config/mail.config';
import queueConfig from '../../config/queue.config';
import broadcastingConfig from '../../config/broadcasting.config';

export class ConfigServiceProvider extends ServiceProvider {
  register(): void {
    setConfig('app', appConfig as unknown as Record<string, unknown>);
    setConfig('db', dbConfig as unknown as Record<string, unknown>);
    setConfig('mail', mailConfig as unknown as Record<string, unknown>);
    setConfig('queue', queueConfig as unknown as Record<string, unknown>);
    setConfig('broadcasting', broadcastingConfig as unknown as Record<string, unknown>);
  }
}
