import { ServiceProvider, setConfig } from '@lara-node/core';
import appConfig from '../../config/app.config';
import dbConfig from '../../config/db.config';
import mailConfig from '../../config/mail.config';
import queueConfig from '../../config/queue.config';
import broadcastingConfig from '../../config/broadcasting.config';

/*
|--------------------------------------------------------------------------
| ConfigServiceProvider
|--------------------------------------------------------------------------
|
| Loads all application config files and registers them with the global
| config() system. This provider must run FIRST so every other provider
| and module can call config('mail.default') and get app-level overrides
| instead of the package defaults.
|
| After running `pnpm artisan vendor:publish --tag=config`, new config
| files will appear in src/config/. Import and register them here.
|
*/
export class ConfigServiceProvider extends ServiceProvider {
  register(): void {
    setConfig('app', appConfig as unknown as Record<string, unknown>);
    setConfig('db', dbConfig as unknown as Record<string, unknown>);
    setConfig('mail', mailConfig as unknown as Record<string, unknown>);
    setConfig('queue', queueConfig as unknown as Record<string, unknown>);
    setConfig('broadcasting', broadcastingConfig as unknown as Record<string, unknown>);
  }
}
