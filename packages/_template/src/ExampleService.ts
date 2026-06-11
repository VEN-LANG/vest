import { config } from "@lara-node/core";
import defaultConfig, { ExampleConfig } from "./config.js";

/*
|--------------------------------------------------------------------------
| Example Service
|--------------------------------------------------------------------------
|
| The unit of functionality your package provides. Keep process-global state
| (connections, pools, registries) OFF module-level `let` bindings — when an
| app bundles its own copy of a package, module-level state is NOT shared with
| the copy loaded from node_modules. Store such state on `globalThis` behind a
| Symbol.for(...) key instead (see @lara-node/db's connection.ts for the
| canonical pattern).
|
*/

export class ExampleService {
  private get settings(): ExampleConfig {
    return config<ExampleConfig>("example", defaultConfig);
  }

  /**
   * Return the configured greeting for the given name.
   */
  greet(name: string): string {
    if (!this.settings.enabled) {
      throw new Error("[@lara-node/example] feature is disabled (set EXAMPLE_ENABLED=true).");
    }
    return `${this.settings.greeting}, ${name}!`;
  }
}
