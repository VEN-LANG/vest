import { Command } from "../Command.js";
import { ArgumentsCamelCase } from "yargs";
import fs from "fs";
import path from "path";
import {
  runMigrations,
  migrateFresh,
  runSeeders,
  rollbackMigrations,
  initDatabase,
  getDbType,
  getMongoDb,
  query,
} from "@vest/db";

export class MigrateCommand extends Command {
  protected signature = "migrate";
  protected description = "Run the database migrations";

  protected options = {
    step: {
      type: "number" as const,
      description: "Number of migrations to run",
      default: 0,
    },
    force: {
      type: "boolean" as const,
      description: "Force migrations to run, ignoring checksum mismatches",
      default: false,
      alias: "f",
    },
    "force-confirm": {
      type: "boolean" as const,
      description: "Prompt for confirmation on checksum mismatches",
      default: false,
      alias: "fc",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    this.info("Running migrations...");

    // Get options directly from args (yargs parsed) as well as this.option for flexibility
    const force = args.force === true || this.option<boolean>("force", false);
    const forceConfirm =
      args["force-confirm"] === true ||
      args.forceConfirm === true ||
      this.option<boolean>("force-confirm", false);
    const step = (args.step as number) || this.option<number>("step", 0);

    if (force) {
      this.warn("Force mode enabled - checksum mismatches will be ignored");
    }

    try {
      await runMigrations({
        command: "up",
        step: step || undefined,
        force,
        forceConfirm,
      });
      this.success("Migrations completed successfully.");
    } catch (error: any) {
      this.error(`Migration failed: ${error.message}`);
      process.exit(1);
    }
  }
}

export class MigrateFreshCommand extends Command {
  protected signature = "migrate:fresh";
  protected description = "Drop all tables and re-run all migrations";

  protected options = {
    seed: {
      type: "boolean" as const,
      description: "Run seeders after migration",
      default: false,
      alias: "s",
    },
    force: {
      type: "boolean" as const,
      description: "Force the operation without confirmation",
      default: false,
      alias: "f",
    },
    "seeder-class": {
      type: "string" as const,
      description: "Specific seeder class to run",
      alias: "c",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const seed = args.seed === true || this.option<boolean>("seed", false);
    const force = args.force === true || this.option<boolean>("force", false);
    const seederClass = (args["seeder-class"] || args.seederClass) as string | undefined;

    if (!force) {
      this.warn("⚠️  This will DROP ALL TABLES and re-run migrations!");
      const confirmed = await this.confirm("Are you sure you want to continue?", false);
      if (!confirmed) {
        this.info("Operation cancelled.");
        return;
      }
    }

    this.warn("Dropping all tables and re-running migrations...");
    try {
      await migrateFresh({ seed, force: true, seederClass }); // Pass force: true since we already confirmed
      this.success("Fresh migration completed successfully.");

      if (seed) {
        this.info("Seeders were run as part of fresh migration.");
      }
    } catch (error: any) {
      this.error(`Fresh migration failed: ${error.message}`);
      process.exit(1);
    }
  }
}

export class MigrateRollbackCommand extends Command {
  protected signature = "migrate:rollback";
  protected description = "Rollback the last database migration batch";

  protected options = {
    step: {
      type: "number" as const,
      description: "Number of batches to rollback",
      default: 1,
      alias: "s",
    },
    force: {
      type: "boolean" as const,
      description: "Force rollback without confirmation",
      default: false,
      alias: "f",
    },
  };

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const step = this.option<number>("step", 1);
    const force = this.option<boolean>("force", false);

    if (!force) {
      this.warn(`⚠️  This will rollback ${step} migration batch(es)!`);
      const confirmed = await this.confirm("Are you sure you want to continue?", false);
      if (!confirmed) {
        this.info("Operation cancelled.");
        return;
      }
    }

    this.info(`Rolling back ${step} migration batch(es)...`);
    try {
      await rollbackMigrations({ step });
      this.success(`Rollback of ${step} batch(es) completed successfully.`);
    } catch (error: any) {
      this.error(`Rollback failed: ${error.message}`);
      process.exit(1);
    }
  }
}

export class MigrateStatusCommand extends Command {
  protected signature = "migrate:status";
  protected description = "Show the status of each migration";

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    this.info("Migration Status:");

    const dir = path.resolve(process.cwd(), "src/database/migrations");

    if (!fs.existsSync(dir)) {
      this.warn("No migrations directory found.");
      return;
    }

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
      .sort();

    if (files.length === 0) {
      this.info("No migration files found.");
      return;
    }

    // Get applied migrations from database (supports both MySQL and MongoDB)
    let appliedMigrations: Map<string, { batch: number }> = new Map();
    try {
      await initDatabase();

      const dbType = getDbType();

      if (dbType === "mongodb") {
        // MongoDB: Query the migrations collection
        const db = getMongoDb();
        const rows = await db
          .collection("migrations")
          .find({}, { projection: { _id: 0, name: 1, batch: 1 } })
          .sort({ migrated_at: 1 })
          .toArray();
        for (const r of rows) {
          appliedMigrations.set(r.name, { batch: r.batch });
        }
      } else {
        // MySQL/SQL: Query the migrations table
        const rows: any[] = await query("SELECT name, batch FROM migrations ORDER BY id");
        for (const r of rows) {
          appliedMigrations.set(r.name, { batch: r.batch });
        }
      }
    } catch (e: any) {
      this.warn(`Could not fetch migration status from DB: ${e.message}`);
    }

    this.line("");

    const rows = files.map((f) => {
      const migration = appliedMigrations.get(f);
      const isApplied = !!migration;
      const status = isApplied
        ? `\x1b[32mRan\x1b[0m (batch ${migration!.batch})`
        : "\x1b[33mPending\x1b[0m";
      return [f, status];
    });

    const ran = files.filter((f) => appliedMigrations.has(f)).length;
    const pending = files.length - ran;

    this.table(["Migration", "Status"], rows);

    this.line("");
    this.info(`Total: ${files.length} migrations (${ran} ran, ${pending} pending)`);
  }
}

export class MakeMigrationCommand extends Command {
  protected signature = "make:migration <name>";
  protected description = "Create a new migration file";

  protected arguments = {
    name: { type: "string" as const, description: "The name of the migration", required: true },
  };

  protected options = {
    table: {
      type: "string" as const,
      description: "The table to be created/modified",
    },
    create: {
      type: "string" as const,
      description: "The table to be created",
    },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const name = String(args.name);
    const tableOption = args.table as string | undefined;
    const createOption = args.create as string | undefined;

    // Parse the migration name to extract table and action
    const parsed = this.parseMigrationName(name);

    // Options override parsed values
    const table = createOption || tableOption || parsed.table;
    const action = createOption ? "create" : tableOption ? "alter" : parsed.action;

    const timestamp = this.getTimestamp();
    const className = this.pascalCase(name) + "Migration";
    const fileName = `${timestamp}_${name.replace(/\s+/g, "_")}.ts`;
    const dir = path.resolve(process.cwd(), "src/database/migrations");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);
    const template = this.getTemplate(name, className, table, action);

    fs.writeFileSync(filePath, template);
    this.info(`Created migration: ${fileName}`);
    if (table) {
      this.info(`Table: ${table} (${action})`);
    }
  }

  /**
   * Parse migration name to extract table name and action type.
   * Follows Laravel conventions:
   * - create_users_table → creates 'users' table
   * - add_column_to_users_table → alters 'users' table
   * - add_column_to_users → alters 'users' table
   * - remove_column_from_users_table → alters 'users' table
   * - modify_column_in_users_table → alters 'users' table
   * - drop_users_table → drops 'users' table
   * - rename_users_table → alters 'users' table
   */
  private parseMigrationName(name: string): {
    table: string | undefined;
    action: "create" | "alter" | "drop";
  } {
    const normalized = name.toLowerCase().replace(/\s+/g, "_");

    // Pattern: create_xxx_table or create_xxx
    const createMatch = normalized.match(/^create_(.+?)(?:_table)?$/);
    if (createMatch) {
      return { table: createMatch[1], action: "create" };
    }

    // Pattern: drop_xxx_table or drop_xxx
    const dropMatch = normalized.match(/^drop_(.+?)(?:_table)?$/);
    if (dropMatch) {
      return { table: dropMatch[1], action: "drop" };
    }

    // Pattern: add_xxx_to_yyy_table or add_xxx_to_yyy
    const addToMatch = normalized.match(/^add_.+_to_(.+?)(?:_table)?$/);
    if (addToMatch) {
      return { table: addToMatch[1], action: "alter" };
    }

    // Pattern: remove_xxx_from_yyy_table or remove_xxx_from_yyy
    const removeFromMatch = normalized.match(/^remove_.+_from_(.+?)(?:_table)?$/);
    if (removeFromMatch) {
      return { table: removeFromMatch[1], action: "alter" };
    }

    // Pattern: modify_xxx_in_yyy_table or modify_xxx_in_yyy or change_xxx_in_yyy
    const modifyInMatch = normalized.match(/^(?:modify|change|update)_.+_in_(.+?)(?:_table)?$/);
    if (modifyInMatch) {
      return { table: modifyInMatch[1], action: "alter" };
    }

    // Pattern: rename_xxx_to_yyy_in_zzz_table (rename column)
    const renameColMatch = normalized.match(/^rename_.+_to_.+_in_(.+?)(?:_table)?$/);
    if (renameColMatch) {
      return { table: renameColMatch[1], action: "alter" };
    }

    // Pattern: rename_xxx_table_to_yyy (rename table - still uses alter)
    const renameTableMatch = normalized.match(/^rename_(.+?)_table(?:_to_.+)?$/);
    if (renameTableMatch) {
      return { table: renameTableMatch[1], action: "alter" };
    }

    // Pattern: xxx_to_yyy_table (generic "to table" pattern)
    const toTableMatch = normalized.match(/.+_to_(.+?)(?:_table)?$/);
    if (toTableMatch) {
      return { table: toTableMatch[1], action: "alter" };
    }

    // Pattern: xxx_from_yyy_table (generic "from table" pattern)
    const fromTableMatch = normalized.match(/.+_from_(.+?)(?:_table)?$/);
    if (fromTableMatch) {
      return { table: fromTableMatch[1], action: "alter" };
    }

    // Pattern: xxx_in_yyy_table (generic "in table" pattern)
    const inTableMatch = normalized.match(/.+_in_(.+?)(?:_table)?$/);
    if (inTableMatch) {
      return { table: inTableMatch[1], action: "alter" };
    }

    // Pattern: xxx_on_yyy_table (generic "on table" pattern)
    const onTableMatch = normalized.match(/.+_on_(.+?)(?:_table)?$/);
    if (onTableMatch) {
      return { table: onTableMatch[1], action: "alter" };
    }

    // No pattern matched - return undefined table
    return { table: undefined, action: "create" };
  }

  private getTimestamp(): string {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? "0" + n : String(n));
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  private pascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  private getTemplate(
    name: string,
    className: string,
    table?: string,
    action: "create" | "alter" | "drop" = "create",
  ): string {
    const tbl = table || name.replace(/[^a-z0-9_]/gi, "_").toLowerCase();

    if (action === "drop") {
      return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@vest/db';

/**
 * Migration: ${name}
 * Drop table: ${tbl}
 */
export default class ${className} implements Migration {
    /**
     * Run the migrations.
     */
    async up(schema: MigrationSchema, query?: QueryFn): Promise<any> {
        return schema.dropTable('${tbl}');
    }

    /**
     * Reverse the migrations.
     */
    async down(schema: MigrationSchema, query?: QueryFn): Promise<any> {
        return schema.createTable('${tbl}', (table: TableBuilder) => {
            table.increments('id');
            // Add the columns that were in the original table
            table.timestamps();
        });
    }
}
`;
    }

    if (action === "alter") {
      return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@vest/db';

/**
 * Migration: ${name}
 * Alter table: ${tbl}
 */
export default class ${className} implements Migration {
    /**
     * Run the migrations.
     */
    async up(schema: MigrationSchema, query?: QueryFn): Promise<any> {
        return schema.alterTable('${tbl}', (table: TableBuilder) => {
            // Add a column:
            // table.string('column_name', 255).nullable();
            
            // Add an index:
            // table.index(['column_name']);
            
            // Add a foreign key:
            // table.foreignKey('foreign_id', 'other_table', 'id', { onDelete: 'CASCADE' });

            // Drop a column:
            // table.dropColumn('column_name');

            // Rename a column:
            // table.renameColumn('old_name', 'new_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    async down(schema: MigrationSchema, query?: QueryFn): Promise<any> {
        return schema.alterTable('${tbl}', (table: TableBuilder) => {
            // Reverse the operations performed in up()
        });
    }
}
`;
    }

    // Default: create table
    return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@vest/db';

/**
 * Migration: ${name}
 * Create table: ${tbl}
 */
export default class ${className} implements Migration {
    /**
     * Run the migrations.
     */
    async up(schema: MigrationSchema, query?: QueryFn): Promise<any> {
        return schema.createTable('${tbl}', (table: TableBuilder) => {
            table.increments('id');
            
            // Add your columns here
            // table.string('name', 255).notNullable();
            // table.text('description').nullable();
            // table.unsignedBigInteger('user_id').notNullable();
            
            // Foreign keys
            // table.foreignKey('user_id', 'users', 'id', { onDelete: 'CASCADE' });
            
            table.timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    async down(schema: MigrationSchema, query?: QueryFn): Promise<any> {
        return schema.dropTable('${tbl}');
    }
}
`;
  }
}
