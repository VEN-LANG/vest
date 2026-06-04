import { Command } from "@lara-node/console";
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
} from "./index.js";

// ──────────────────────────────────────────────────────────────────────────────
// Migration Commands
// ──────────────────────────────────────────────────────────────────────────────

export class MigrateCommand extends Command {
  protected signature = "migrate";
  protected description = "Run the database migrations";

  protected options = {
    step: { type: "number" as const, description: "Number of migrations to run", default: 0 },
    force: { type: "boolean" as const, description: "Force migrations to run, ignoring checksum mismatches", default: false, alias: "f" },
    "force-confirm": { type: "boolean" as const, description: "Prompt for confirmation on checksum mismatches", default: false, alias: "fc" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    this.info("Running migrations...");
    const force = args.force === true || this.option<boolean>("force", false);
    const forceConfirm = args["force-confirm"] === true || args.forceConfirm === true || this.option<boolean>("force-confirm", false);
    const step = (args.step as number) || this.option<number>("step", 0);

    if (force) this.warn("Force mode enabled - checksum mismatches will be ignored");

    try {
      await runMigrations({ command: "up", step: step || undefined, force, forceConfirm });
      this.success("Migrations completed successfully.");
    } catch (error: unknown) {
      this.error(`Migration failed: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

export class MigrateFreshCommand extends Command {
  protected signature = "migrate:fresh";
  protected description = "Drop all tables and re-run all migrations";

  protected options = {
    seed: { type: "boolean" as const, description: "Run seeders after migration", default: false, alias: "s" },
    force: { type: "boolean" as const, description: "Force the operation without confirmation", default: false, alias: "f" },
    "seeder-class": { type: "string" as const, description: "Specific seeder class to run", alias: "c" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const seed = args.seed === true || this.option<boolean>("seed", false);
    const force = args.force === true || this.option<boolean>("force", false);
    const seederClass = (args["seeder-class"] || args.seederClass) as string | undefined;

    if (!force) {
      this.warn("⚠️  This will DROP ALL TABLES and re-run migrations!");
      const confirmed = await this.confirm("Are you sure you want to continue?", false);
      if (!confirmed) { this.info("Operation cancelled."); return; }
    }

    this.warn("Dropping all tables and re-running migrations...");
    try {
      await migrateFresh({ seed, force: true, seederClass });
      this.success("Fresh migration completed successfully.");
      if (seed) this.info("Seeders were run as part of fresh migration.");
    } catch (error: unknown) {
      this.error(`Fresh migration failed: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

export class MigrateRollbackCommand extends Command {
  protected signature = "migrate:rollback";
  protected description = "Rollback the last database migration batch";

  protected options = {
    step: { type: "number" as const, description: "Number of batches to rollback", default: 1, alias: "s" },
    force: { type: "boolean" as const, description: "Force rollback without confirmation", default: false, alias: "f" },
  };

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const step = this.option<number>("step", 1);
    const force = this.option<boolean>("force", false);

    if (!force) {
      this.warn(`⚠️  This will rollback ${step} migration batch(es)!`);
      const confirmed = await this.confirm("Are you sure you want to continue?", false);
      if (!confirmed) { this.info("Operation cancelled."); return; }
    }

    this.info(`Rolling back ${step} migration batch(es)...`);
    try {
      await rollbackMigrations({ step });
      this.success(`Rollback of ${step} batch(es) completed successfully.`);
    } catch (error: unknown) {
      this.error(`Rollback failed: ${(error as Error).message}`);
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

    if (!fs.existsSync(dir)) { this.warn("No migrations directory found."); return; }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") || f.endsWith(".js")).sort();

    if (files.length === 0) { this.info("No migration files found."); return; }

    let appliedMigrations: Map<string, { batch: number }> = new Map();
    try {
      await initDatabase();
      const dbType = getDbType();

      if (dbType === "mongodb") {
        const db = getMongoDb();
        const rows = await db.collection("migrations").find({}, { projection: { _id: 0, name: 1, batch: 1 } }).sort({ migrated_at: 1 }).toArray();
        for (const r of rows) appliedMigrations.set(r.name, { batch: r.batch });
      } else {
        const rows = await query("SELECT name, batch FROM migrations ORDER BY id") as Array<{ name: string; batch: number }>;
        for (const r of rows) appliedMigrations.set(r.name, { batch: r.batch });
      }
    } catch (e: unknown) {
      this.warn(`Could not fetch migration status from DB: ${(e as Error).message}`);
    }

    this.line("");
    const rows = files.map((f) => {
      const migration = appliedMigrations.get(f);
      const status = migration ? `\x1b[32mRan\x1b[0m (batch ${migration.batch})` : "\x1b[33mPending\x1b[0m";
      return [f, status];
    });

    this.table(["Migration", "Status"], rows);
    this.line("");
    this.info(`Total: ${files.length} migrations (${[...appliedMigrations.keys()].filter(f => files.includes(f)).length} ran, ${files.filter(f => !appliedMigrations.has(f)).length} pending)`);
  }
}

export class MakeMigrationCommand extends Command {
  protected signature = "make:migration <name>";
  protected description = "Create a new migration file";

  protected arguments = {
    name: { type: "string" as const, description: "The name of the migration", required: true },
  };

  protected options = {
    table: { type: "string" as const, description: "The table to be created/modified" },
    create: { type: "string" as const, description: "The table to be created" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const name = String(args.name);
    const tableOption = args.table as string | undefined;
    const createOption = args.create as string | undefined;

    const parsed = this.parseMigrationName(name);
    const table = createOption || tableOption || parsed.table;
    const action = createOption ? "create" : tableOption ? "alter" : parsed.action;

    const timestamp = this.getTimestamp();
    const className = this.pascalCase(name) + "Migration";
    const fileName = `${timestamp}_${name.replace(/\s+/g, "_")}.ts`;
    const dir = path.resolve(process.cwd(), "src/database/migrations");

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, fileName), this.getTemplate(name, className, table, action));
    this.info(`Created migration: ${fileName}`);
    if (table) this.info(`Table: ${table} (${action})`);
  }

  private parseMigrationName(name: string): { table: string | undefined; action: "create" | "alter" | "drop" } {
    const n = name.toLowerCase().replace(/\s+/g, "_");
    const createMatch = n.match(/^create_(.+?)(?:_table)?$/);
    if (createMatch) return { table: createMatch[1], action: "create" };
    const dropMatch = n.match(/^drop_(.+?)(?:_table)?$/);
    if (dropMatch) return { table: dropMatch[1], action: "drop" };
    const addToMatch = n.match(/^add_.+_to_(.+?)(?:_table)?$/);
    if (addToMatch) return { table: addToMatch[1], action: "alter" };
    const removeFromMatch = n.match(/^remove_.+_from_(.+?)(?:_table)?$/);
    if (removeFromMatch) return { table: removeFromMatch[1], action: "alter" };
    const modifyInMatch = n.match(/^(?:modify|change|update)_.+_in_(.+?)(?:_table)?$/);
    if (modifyInMatch) return { table: modifyInMatch[1], action: "alter" };
    const toTableMatch = n.match(/.+_to_(.+?)(?:_table)?$/);
    if (toTableMatch) return { table: toTableMatch[1], action: "alter" };
    return { table: undefined, action: "create" };
  }

  private getTimestamp(): string {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? "0" + n : String(n));
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  private pascalCase(str: string): string {
    return str.replace(/[^a-zA-Z0-9]+/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
  }

  private getTemplate(name: string, className: string, table?: string, action: "create" | "alter" | "drop" = "create"): string {
    const tbl = table || name.replace(/[^a-z0-9_]/gi, "_").toLowerCase();

    if (action === "drop") {
      return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@lara-node/db';

export class ${className} implements Migration {
    async up(schema: MigrationSchema, _query?: QueryFn): Promise<void> {
        await schema.dropTable('${tbl}');
    }
    async down(schema: MigrationSchema, _query?: QueryFn): Promise<void> {
        await schema.createTable('${tbl}', (table: TableBuilder) => {
            table.increments('id');
            table.timestamps();
        });
    }
}
`;
    }

    if (action === "alter") {
      return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@lara-node/db';

export class ${className} implements Migration {
    async up(schema: MigrationSchema, _query?: QueryFn): Promise<void> {
        await schema.alterTable('${tbl}', (table: TableBuilder) => {
            // table.string('new_column', 255).nullable();
            // table.index(['new_column']);
            // table.foreignIdFor('users').constrained().cascadeOnDelete();
        });
    }
    async down(schema: MigrationSchema, _query?: QueryFn): Promise<void> {
        await schema.alterTable('${tbl}', (_table: TableBuilder) => {
            // Reverse the operations from up()
        });
    }
}
`;
    }

    return `import type { Migration, MigrationSchema, TableBuilder, QueryFn } from '@lara-node/db';

export class ${className} implements Migration {
    async up(schema: MigrationSchema, _query?: QueryFn): Promise<void> {
        await schema.createTable('${tbl}', (table: TableBuilder) => {
            table.increments('id');
            // table.string('name', 255).notNullable();
            // table.foreignIdFor('users').constrained().cascadeOnDelete();
            table.timestamps();
            table.softDeletes();
        });
    }
    async down(schema: MigrationSchema, _query?: QueryFn): Promise<void> {
        await schema.dropTable('${tbl}');
    }
}
`;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Database Commands
// ──────────────────────────────────────────────────────────────────────────────

export class DbSeedCommand extends Command {
  protected signature = "db:seed";
  protected description = "Seed the database with records";

  protected options = {
    class: { type: "string" as const, description: "The class name of the seeder to run", alias: "c" },
    force: { type: "boolean" as const, description: "Force the operation to run in production", default: false, alias: "f" },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    const seederClass = (args.class as string) || this.option<string>("class");
    const force = args.force === true || this.option<boolean>("force", false);

    if (process.env.NODE_ENV === "production" && !force) {
      this.error("Cannot run seeders in production without --force flag");
      process.exit(1);
    }

    this.info("Seeding database...");
    if (seederClass) this.comment(`Running seeder: ${seederClass}`);

    try {
      await runSeeders({ class: seederClass, force });
      this.success("Database seeding completed successfully.");
    } catch (error: unknown) {
      this.error(`Seeding failed: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

export class DbWipeCommand extends Command {
  protected signature = "db:wipe";
  protected description = "Drop all tables, views, and types";

  protected options = {
    force: { type: "boolean" as const, description: "Force the operation to run in production", default: false, alias: "f" },
  };

  async handle(_args: ArgumentsCamelCase): Promise<void> {
    const force = this.option<boolean>("force", false);

    if (!force) {
      this.warn("⚠️  This command will DROP ALL TABLES!");
      const confirmed = await this.confirm("Are you sure you want to continue?", false);
      if (!confirmed) { this.info("Operation cancelled."); return; }
    }

    this.warn("Dropping all tables...");
    this.warn("Not yet implemented. Use migrate:fresh instead.");
  }
}

export class MakeSeederCommand extends Command {
  protected signature = "make:seeder <name>";
  protected description = "Create a new seeder class";

  protected arguments = {
    name: { type: "string" as const, description: "The name of the seeder class", required: true },
  };

  async handle(args: ArgumentsCamelCase): Promise<void> {
    let name = String(args.name);
    if (!name.toLowerCase().endsWith("seeder")) name = name + "Seeder";
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const fileName = `${name}.ts`;
    const dir = path.resolve(process.cwd(), "src/database/seeders");

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, fileName);
    if (fs.existsSync(filePath)) {
      this.error(`Seeder ${fileName} already exists!`);
      process.exit(1);
    }

    fs.writeFileSync(filePath, this.getTemplate(name));
    this.success(`Created seeder: ${fileName}`);
  }

  private getTemplate(name: string): string {
    return `import User from '../app/Models/User/User';

export class ${name} {
    async run(): Promise<void> {
        // Example: await User.create({ name: 'John', email: 'john@example.com' });
        console.log('${name} complete');
    }
}
`;
  }
}
