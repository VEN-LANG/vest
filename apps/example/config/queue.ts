import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ensure .env loaded if this module is imported directly
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/*
|--------------------------------------------------------------------------
| Queue Configuration
|--------------------------------------------------------------------------
|
| Here you may configure the connection options for each queue backend
| used by your application. This includes the default queue, as well
| as a variety of queue "connections" using different drivers.
|
*/

export interface QueueConnectionConfig {
  driver: "sync" | "database" | "redis";
  table?: string; // for database driver
  queue?: string; // default queue name
  retry_after?: number; // seconds before retrying a job
  connection?: string; // redis connection name
}

export interface QueueConfig {
  default: string;
  connections: Record<string, QueueConnectionConfig>;
  failed: {
    driver: "database";
    table: string;
  };
  defaults: {
    tries: number;
    timeout: number;
    backoff: number | number[];
    maxExceptions: number;
  };
}

const queueConfig: QueueConfig = {
  /*
    |--------------------------------------------------------------------------
    | Default Queue Connection Name
    |--------------------------------------------------------------------------
    |
    | Laravel's queue API supports a variety of backends via a single
    | unified API. Here you may define the default connection used by
    | the queue worker.
    |
    */
  default: process.env.QUEUE_CONNECTION || "sync",

  /*
    |--------------------------------------------------------------------------
    | Queue Connections
    |--------------------------------------------------------------------------
    |
    | Here you may configure the connection options for each queue backend
    | used by your application.
    |
    */
  connections: {
    sync: {
      driver: "sync",
    },

    database: {
      driver: "database",
      table: "jobs",
      queue: "default",
      retry_after: 90,
    },

    redis: {
      driver: "redis",
      connection: process.env.REDIS_QUEUE_CONNECTION || "default",
      queue: process.env.REDIS_QUEUE || "default",
      retry_after: 90,
    },
  },

  /*
    |--------------------------------------------------------------------------
    | Failed Queue Jobs
    |--------------------------------------------------------------------------
    |
    | These options configure the behavior of failed queue job logging.
    |
    */
  failed: {
    driver: "database",
    table: "failed_jobs",
  },

  /*
    |--------------------------------------------------------------------------
    | Job Default Settings
    |--------------------------------------------------------------------------
    */
  defaults: {
    tries: 3,
    timeout: 60,
    backoff: [1, 5, 10], // seconds between retries
    maxExceptions: 1,
  },
};

export const QUEUE_CONNECTION = queueConfig.default;

export default queueConfig;
