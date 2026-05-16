export interface TelescopeConfig {
  enabled: boolean;
  path: string;
  token?: string;
  watchers: {
    requests: boolean;
    queries: boolean;
    jobs: boolean;
    cache: boolean;
    logs: boolean;
    exceptions: boolean;
    scheduler: boolean;
    schedule?: boolean;
  };
  pruneAfterHours: number;
  maxEntries: number;
  ignoredPaths?: string[];
  responseBodySizeLimit?: number;
}

const telescopeConfig: TelescopeConfig = {
  enabled: process.env.TELESCOPE_ENABLED !== "false",
  path: process.env.TELESCOPE_PATH ?? "/telescope",
  watchers: {
    requests: true,
    queries: true,
    jobs: true,
    cache: true,
    logs: true,
    exceptions: true,
    scheduler: true,
  },
  pruneAfterHours: parseInt(process.env.TELESCOPE_PRUNE_HOURS ?? "48", 10),
  maxEntries: parseInt(process.env.TELESCOPE_MAX_ENTRIES ?? "1000", 10),
};

export default telescopeConfig;
