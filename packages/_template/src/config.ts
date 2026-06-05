/*
|--------------------------------------------------------------------------
| Example Config
|--------------------------------------------------------------------------
|
| Define your package's configuration shape and its defaults here. The
| defaults are registered under a namespaced key in index.ts via setConfig(),
| and read back at call time with config<ExampleConfig>("example", defaults).
|
| Read env vars INSIDE accessors / at call time (not at module top-level) so
| that dotenv has populated process.env before the values are captured.
|
*/

export interface ExampleConfig {
  /** Whether the feature is enabled. */
  enabled: boolean;
  /** A sample greeting used by ExampleService. */
  greeting: string;
}

const exampleConfig: ExampleConfig = {
  enabled: process.env.EXAMPLE_ENABLED !== "false",
  greeting: process.env.EXAMPLE_GREETING || "Hello from @lara-node/example",
};

export default exampleConfig;
