export {
  default as Schema,
  MongoSchema,
  Column,
  TableBuilder,
  RawExpression,
  raw,
} from "./Schema.js";
export type { MigrationSchema, Migration } from "./Schema.js";
export { run as runMigrations } from "./MigrationRunner.js";
export { run as runSeeders } from "./SeederRunner.js";
export type { SeederOptions } from "./SeederRunner.js";
export { run as migrateFresh } from "./MigrateFresh.js";
import { query, initDatabase, getDbType, getMongoDb } from "../connection.js";
export { query, initDatabase, getDbType, getMongoDb };

export interface MigrationOptions {
  step?: number;
  force?: boolean;
  forceConfirm?: boolean;
  command?: "up" | "down";
}

export async function rollbackMigrations(options: { step?: number } = {}): Promise<void> {
  const { run } = await import("./MigrationRunner.js");
  await run({ command: "down", step: options.step || 1 } as any);
}

export async function makeMigration(
  name: string,
  options?: { table?: string; alter?: boolean },
): Promise<void> {
  const args = ["", "", name];
  if (options?.table) args.push(`--table=${options.table}`);
  if (options?.alter) args.push("--alter");
  process.argv = args;
  await import("./MakeMigration.js");
}
