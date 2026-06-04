import path from 'path';
import { EventServiceProvider as BaseProvider } from '@lara-node/events';

/*
|--------------------------------------------------------------------------
| EventServiceProvider
|--------------------------------------------------------------------------
|
| Extends the framework EventServiceProvider.
| Listeners/ and Subscribers/ directories are scanned automatically —
| no index.ts barrel needed. Any class decorated with @ListensTo() or
| @Subscriber() is registered when its file is loaded.
|
*/
export class EventServiceProvider extends BaseProvider {
  protected override async discoverListeners(): Promise<void> {
    this.loadDir(path.join(__dirname, '../Listeners'));
  }

  protected override async discoverSubscribers(): Promise<void> {
    this.loadDir(path.join(__dirname, '../Subscribers'));
  }

  private loadDir(dir: string): void {
    const fs = require('fs') as typeof import('fs');
    const pathMod = require('path') as typeof import('path');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        try { require(pathMod.join(dir, file)); } catch { /* skip */ }
      }
    }
  }
}
