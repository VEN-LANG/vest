import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/*
|--------------------------------------------------------------------------
| Horizon Configuration
|--------------------------------------------------------------------------
|
| Controls the Horizon dashboard and its queue supervisors.
|
| Supervisors mirror Laravel Horizon's concept: each supervisor entry
| defines a named group of workers, the queues they process, and
| resource limits. Multiple processes can be spawned per supervisor.
|
| Horizon reads the current NODE_ENV to pick the right environment block.
| Unknown environments fall back to "development".
|
*/

export interface HorizonSupervisor {
  /** Unique name shown in the dashboard */
  name: string;
  /** Queue connection (default: QUEUE_CONNECTION env var) */
  connection?: string;
  /** Queue(s) to process — comma-separated string or array */
  queue: string | string[];
  /** Memory limit in MB before the worker restarts */
  memory: number;
  /** Job timeout in seconds */
  timeout: number;
  /** Seconds to sleep between polls when queue is empty */
  sleep: number;
  /** Max job attempts before permanent failure */
  tries: number;
  /** Stop after processing this many jobs (0 = unlimited) */
  maxJobs: number;
  /** Stop after running for this many seconds (0 = unlimited) */
  maxTime: number;
  /** Number of parallel worker processes to spawn */
  processes: number;
}

export interface HorizonEnvironmentConfig {
  supervisor: HorizonSupervisor[];
}

export interface HorizonConfig {
  /** URL path to the dashboard */
  path: string;
  /** Bearer token required to access the dashboard — required in production */
  token: string | undefined;
  /** Explicitly enable/disable Horizon (auto = on in dev, off in prod without token) */
  enabled: boolean | "auto";
  /** Number of completed jobs to keep in the in-memory ring buffer */
  trimAt: number;
  /** Per-environment supervisor definitions */
  environments: Record<string, HorizonEnvironmentConfig>;
}

const horizonConfig: HorizonConfig = {
  path: process.env.HORIZON_PATH || "/horizon",

  token: process.env.HORIZON_TOKEN || undefined,

  enabled: process.env.HORIZON_ENABLED === "false" ? false : "auto",

  trimAt: parseInt(process.env.HORIZON_TRIM_AT ?? "500", 10),

  /*
  |--------------------------------------------------------------------------
  | Environments
  |--------------------------------------------------------------------------
  |
  | Define supervisor groups per environment.  The "production" block is
  | typically more conservative with sleep/timeout; "development" is
  | more aggressive so feedback is immediate.
  | emails,notifications,default,payments,reports,invoices,dashboards,audits
  */
  environments: {
    development: {
      supervisor: [
        {
          name: "default-supervisor",
          connection: process.env.QUEUE_CONNECTION || "sync",
          queue: [
            "default",
            "emails",
            "notifications",
            "payments",
            "reports",
            "invoices",
            "dashboards",
            "audits",
          ],
          memory: 128,
          timeout: 60,
          sleep: 3,
          tries: 3,
          maxJobs: 0,
          maxTime: 0,
          processes: 1,
        },
      ],
    },

    production: {
      supervisor: [
        {
          name: "default-supervisor",
          connection: process.env.QUEUE_CONNECTION || "database",
          queue: ["default"],
          memory: 256,
          timeout: 90,
          sleep: 5,
          tries: 3,
          maxJobs: 0,
          maxTime: 0,
          processes: 2,
        },
        {
          name: "high-priority",
          connection: process.env.QUEUE_CONNECTION || "database",
          queue: ["high", "default"],
          memory: 256,
          timeout: 60,
          sleep: 3,
          tries: 5,
          maxJobs: 0,
          maxTime: 0,
          processes: 1,
        },
      ],
    },
  },
};

export default horizonConfig;
