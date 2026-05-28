import path from 'path';
import { Kernel as BaseKernel } from '@lara-node/console';

export class ConsoleKernel extends BaseKernel {
  async boot(): Promise<void> {
    this.discoverCommands(path.join(__dirname, 'Commands'));

    // Collect commands declared by all registered service providers
    if (this._app) {
      this.setProviders(this._app.getBootedProviders());
    }

    await super.boot();
  }
}
