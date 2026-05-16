import { setConfig } from "@lara-node/core";
import _telescopeConfig from "./telescope.config.js";
setConfig("telescope", _telescopeConfig as unknown as Record<string, unknown>);

export { TelescopeServiceProvider } from "./TelescopeServiceProvider.js";
export { TelescopeStore } from "./TelescopeStore.js";
export { QueryWatcher } from "./Watchers/QueryWatcher.js";
export type { TelescopeEntry, EntryType } from "./TelescopeStore.js";
export { CacheWatcher } from "./Watchers/CacheWatcher.js";
