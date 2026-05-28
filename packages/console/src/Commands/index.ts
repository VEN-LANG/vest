/*
|--------------------------------------------------------------------------
| Console System Commands
|--------------------------------------------------------------------------
|
| These are the core console commands that are always available regardless
| of which optional packages are installed.
|
| Feature-specific commands live in their own packages and are registered
| via the ServiceProvider.commands() mechanism:
|
|   @lara-node/db       → MigrateCommand, DbSeedCommand, MakeMigrationCommand, etc.
|   @lara-node/cache    → CacheClearCommand, CacheListCommand, etc.
|   @lara-node/queue    → QueueWorkCommand, ScheduleRunCommand, etc.
|   @lara-node/events   → EventListCommand, BroadcastChannelsCommand, etc.
|   @lara-node/horizon  → HorizonWorkCommand, HorizonStatusCommand, etc.
|   @lara-node/router   → RouteListCommand, DocsGenerateCommand, etc.
|
*/

// Key management
export { KeyGenerateCommand } from "./KeyGenerateCommand.js";

// Dev server
export { ServeCommand } from "./ServeCommand.js";

// Vendor publish
export { VendorPublishCommand } from "./VendorPublishCommand.js";

// Make generators (always available — scaffold tooling)
export {
  MakeModelCommand,
  MakeMiddlewareCommand,
  MakeProviderCommand,
  MakePolicyCommand,
  MakeRequestCommand,
  MakeJobCommand,
  MakeEventCommand,
  MakeListenerCommand,
  MakeNotificationCommand,
  MakeMailCommand,
  MakeRuleCommand,
  MakeResourceCommand,
  MakeFactoryCommand,
  MakeTestCommand,
} from "./MakeCommands.js";

export { MakeController as MakeControllerCommand } from "./MakeCommand.js";
