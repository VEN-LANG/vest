/*
|--------------------------------------------------------------------------
| @lara-node/example — Package Entry Point
|--------------------------------------------------------------------------
|
| Register the package's default config under a namespaced key on import, then
| re-export the public API. Keep this file as the single source of truth for
| what the package exposes.
|
*/

import { setConfig } from "@lara-node/core";
import _exampleConfig from "./config.js";

// Register defaults so config("example") works even before the app overrides it.
setConfig("example", _exampleConfig as unknown as Record<string, unknown>);

export { default as exampleConfig } from "./config.js";
export type { ExampleConfig } from "./config.js";

export { ExampleService } from "./ExampleService.js";
export { ExampleServiceProvider } from "./ExampleServiceProvider.js";
