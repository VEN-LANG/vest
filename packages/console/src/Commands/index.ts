/*
|--------------------------------------------------------------------------
| Eloquent System Commands Index
|--------------------------------------------------------------------------
|
| These are the core framework commands that come with the eloquent package.
| They are registered automatically by the Kernel.
|
*/

// Cache Commands
export {
  CacheClearCommand,
  CacheListCommand,
  CacheGetCommand,
  CacheSetCommand,
  CacheForgetCommand,
  CacheHasCommand,
  CacheKeyCommand,
  CacheDriverCommand,
} from "./CacheCommands.js";

// Key Commands
export { KeyGenerateCommand } from "./KeyGenerateCommand.js";

// Migration Commands
export {
  MigrateCommand,
  MigrateFreshCommand,
  MigrateRollbackCommand,
  MigrateStatusCommand,
  MakeMigrationCommand,
} from "./MigrationCommands.js";

// Database Commands
export { DbSeedCommand, DbWipeCommand, MakeSeederCommand } from "./DatabaseCommands.js";

// Route Commands
export { RouteListCommand } from "./RouteCommands.js";

// Queue Commands
export {
  QueueWorkCommand,
  QueueListenCommand,
  QueueRestartCommand,
  QueueRetryCommand,
  QueueForgetCommand,
  QueueFlushCommand,
  QueueFailedCommand,
  QueueClearCommand,
  QueueStatusCommand,
  QueueJobsCommand,
  ScheduleRunCommand,
  ScheduleWorkCommand,
  ScheduleListCommand,
} from "./QueueCommands.js";

// Event Commands
export {
  EventListCommand,
  EventDispatchCommand,
  EventClearCommand,
  EventGenerateCommand,
  ListenerGenerateCommand,
  SubscriberGenerateCommand,
} from "./EventCommands.js";

// Broadcast Commands
export {
  BroadcastConnectionsCommand,
  BroadcastChannelsCommand,
  BroadcastTerminateCommand,
  BroadcastSendCommand,
} from "./BroadcastCommands.js";

// Documentation Commands
export { DocsGenerateCommand, DocsListCommand } from "./DocsCommands.js";

// Horizon Commands
export {
  HorizonWorkCommand,
  HorizonPauseCommand,
  HorizonContinueCommand,
  HorizonTerminateCommand,
  HorizonStatusCommand,
  HorizonListCommand,
} from "./HorizonCommands.js";

// Serve Command
export { ServeCommand } from "./ServeCommand.js";

// Vendor Publish
export { VendorPublishCommand } from "./VendorPublishCommand.js";
