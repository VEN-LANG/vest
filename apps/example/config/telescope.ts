import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/*
|--------------------------------------------------------------------------
| Telescope Configuration
|--------------------------------------------------------------------------
|
| Telescope records application activity for debugging and monitoring.
| Each watcher can be toggled independently. Paths listed in
| ignoredPaths are silently dropped from the request watcher.
|
*/

export interface TelescopeWatchersConfig {
  /** Record every HTTP request and response */
  requests: boolean;
  /** Record unhandled exceptions */
  exceptions: boolean;
  /** Record queue job lifecycle events */
  jobs: boolean;
  /** Record scheduled task runs */
  schedule: boolean;
  /** Intercept and record console.error / warn / info / log */
  logs: boolean;
  /** Record DB queries (requires manual QueryWatcher.record() calls) */
  queries: boolean;
  /** Record cache operations (requires manual CacheWatcher.record() calls) */
  cache: boolean;
}

export interface TelescopeConfig {
  /** URL path to the dashboard */
  path: string;
  /** Bearer token required to access the dashboard — required in production */
  token: string | undefined;
  /** Explicitly enable/disable Telescope (auto = on in dev, off in prod without token) */
  enabled: boolean | "auto";
  /** Maximum entries kept in the in-memory ring buffer */
  maxEntries: number;
  /** Per-watcher on/off switches */
  watchers: TelescopeWatchersConfig;
  /** Request paths that the request watcher should skip */
  ignoredPaths: string[];
  /** Truncate response bodies larger than this byte limit (0 = no limit) */
  responseBodySizeLimit: number;
}

const telescopeConfig: TelescopeConfig = {
  path: process.env.TELESCOPE_PATH || "/telescope",

  token: process.env.TELESCOPE_TOKEN || undefined,

  enabled: process.env.TELESCOPE_ENABLED === "false" ? false : "auto",

  maxEntries: parseInt(process.env.TELESCOPE_MAX_ENTRIES ?? "1000", 10),

  watchers: {
    requests: process.env.TELESCOPE_REQUESTS !== "false",
    exceptions: process.env.TELESCOPE_EXCEPTIONS !== "false",
    jobs: process.env.TELESCOPE_JOBS !== "false",
    schedule: process.env.TELESCOPE_SCHEDULE !== "false",
    logs: process.env.TELESCOPE_LOGS !== "false",
    queries: process.env.TELESCOPE_QUERIES !== "false",
    cache: process.env.TELESCOPE_CACHE !== "false",
  },

  ignoredPaths: [
    "/horizon",
    "/horizon/api",
    "/telescope",
    "/telescope/api",
    "/health",
    "/ping",
    "/favicon.ico",
    ...(process.env.TELESCOPE_IGNORED_PATHS
      ? process.env.TELESCOPE_IGNORED_PATHS.split(",").map((p) => p.trim())
      : []),
  ],

  responseBodySizeLimit: parseInt(process.env.TELESCOPE_RESPONSE_SIZE_LIMIT ?? "65536", 10),
};

export default telescopeConfig;
