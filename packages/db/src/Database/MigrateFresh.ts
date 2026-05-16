import readline from "readline";
import { initDatabase, query, getDbType, getMongoDb } from "../connection.js";
import path from "path";

interface MigrateFreshOptions {
  force?: boolean;
  seed?: boolean;
  seederClass?: string;
}

function parseArgs(argv: string[]): MigrateFreshOptions {
  const out: MigrateFreshOptions = { force: false, seed: false, seederClass: undefined };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force" || a === "-f") out.force = true;
    else if (a === "--seed" || a === "-s") out.seed = true;
    else if (a.startsWith("--seeder=")) out.seederClass = a.split("=")[1];
    else if (a.startsWith("--class=")) out.seederClass = a.split("=")[1];
  }
  return out;
}

async function promptConfirm(question: string) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans: string = await new Promise((res) =>
    rl.question(question + " ", (a) => {
      rl.close();
      res(a);
    }),
  );
  return /^y(es)?$/i.test(ans.trim());
}

async function runSeedersHelper(seederClass?: string): Promise<void> {
  const mod = (await import("./SeederRunner.js")) as any;
  if (typeof mod.runWithOptions === "function") {
    await mod.runWithOptions({ class: seederClass });
  } else if (typeof mod.run === "function") {
    await mod.run();
  } else {
    console.warn("Seeder runner not available");
  }
}

export async function run(inputArgs?: MigrateFreshOptions) {
  await initDatabase();

  const parsedArgs = parseArgs(process.argv);
  const args: MigrateFreshOptions = inputArgs ? { ...parsedArgs, ...inputArgs } : parsedArgs;

  if (getDbType() === "mongodb") {
    const db = getMongoDb();
    const dbName = db.databaseName;

    if (!args.force) {
      const ok = await promptConfirm(
        `This will DROP ALL COLLECTIONS in database '${dbName}'. Are you sure? (y/N)`,
      );
      if (!ok) {
        console.log("Aborted.");
        process.exit(0);
      }
    } else {
      console.log("Force flag provided; proceeding without confirmation");
    }

    const collections = await db.collections();
    for (const c of collections) {
      try {
        await c.drop();
      } catch {
        /* ignore */
      }
    }

    console.log("Running migrations...");
    const { run: runMigrations } = (await import("./MigrationRunner.js")) as any;
    await runMigrations();

    if (args.seed) {
      console.log("Running seeders...");
      await runSeedersHelper(args.seederClass);
    }

    console.log("migrate:fresh complete");
    return;
  }

  // MySQL path
  const dbNameRows: any = await query("SELECT DATABASE() as db");
  const dbName = dbNameRows && dbNameRows[0] && dbNameRows[0].db;

  if (!args.force) {
    const ok = await promptConfirm(
      `This will DROP ALL TABLES in database '${dbName}'. Are you sure? (y/N)`,
    );
    if (!ok) {
      console.log("Aborted.");
      process.exit(0);
    }
  } else {
    console.log("Force flag provided; proceeding without confirmation");
  }

  const lockName = process.env.MIGRATION_LOCK_NAME || "lara_node_migrations_lock";
  try {
    const lrows: any = await query("SELECT GET_LOCK(?, 10) as got", [lockName]);
    const got = lrows && lrows[0] && (lrows[0].got === 1 || lrows[0].got === "1");
    if (!got) throw new Error(`Could not acquire lock ${lockName}`);
  } catch (e) {
    console.error("Failed to acquire lock before migrate:fresh", e);
    process.exit(1);
  }

  try {
    console.log("Collecting tables to drop...");
    try {
      await query("SET FOREIGN_KEY_CHECKS = 0");
    } catch (_) {}

    const rows: any[] = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type='BASE TABLE'",
    );
    const names = rows.map((r) => r.table_name).filter(Boolean);
    if (!names.length) console.log("No tables found in database.");
    else {
      console.log("Dropping tables:", names.join(", "));
      for (const n of names) {
        try {
          await query(`DROP TABLE IF EXISTS \`${n}\``);
        } catch (e) {
          console.warn("Failed to drop table", n, e);
        }
      }
    }

    try {
      await query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (_) {}
    try {
      await query("SELECT RELEASE_LOCK(?)", [lockName]);
    } catch (_) {}

    console.log("Running migrations...");
    const { run: runMigrations } = (await import("./MigrationRunner.js")) as any;
    await runMigrations();

    if (args.seed) {
      console.log("Running seeders...");
      await runSeedersHelper(args.seederClass);
    }

    console.log("migrate:fresh complete");
  } finally {
    try {
      await query("SELECT RELEASE_LOCK(?)", [lockName]);
    } catch (_) {}
    try {
      await query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (_) {}
  }
}
