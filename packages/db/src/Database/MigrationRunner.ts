import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import crypto from "crypto";
import readline from "readline";
import os from "os";
import { query, initDatabase, getDbType, getMongoDb } from "../connection.js";
import Schema, { MongoSchema } from "./Schema.js";

// helper to resolve CommonJS/ESModule default exports from required migration files
function resolveMigrationModule(mod: any) {
  if (!mod) return mod;
  // if it's an object with default property, prefer that (handle esModule wrappers)
  if (mod && typeof mod === "object" && "default" in mod && mod.default)
    return resolveMigrationModule(mod.default);
  // prefer direct object that exposes up/down methods
  if (
    mod &&
    typeof mod === "object" &&
    (typeof mod.up === "function" || typeof mod.down === "function")
  )
    return mod;
  // if it's a function, it may be a class constructor with prototype methods - try instantiate
  if (typeof mod === "function") {
    // detect likely class by checking prototype methods
    try {
      const proto = mod.prototype || {};
      if (typeof proto.up === "function" || typeof proto.down === "function") {
        try {
          const inst = new (mod as any)();
          if (inst && (typeof inst.up === "function" || typeof inst.down === "function"))
            return inst;
        } catch (e) {
          // instantiation failed; fallthrough to returning original function
        }
      }
    } catch (e) {}
    return mod;
  }
  return mod;
}

async function ensureMigrationsTable() {
  if (getDbType() === "mongodb") {
    const db = getMongoDb();
    // ensure migrations collection exists and unique index on name
    const exists = await db.listCollections({ name: "migrations" }).hasNext();
    if (!exists) await db.createCollection("migrations");
    const mig = db.collection("migrations");
    try {
      await mig.createIndex({ name: 1 }, { unique: true });
    } catch (e) {}
    const lockExists = await db.listCollections({ name: "migration_locks" }).hasNext();
    if (!lockExists) await db.createCollection("migration_locks");
    // ensure a unique index on lock_name for safe lock acquisition without relying on _id type
    try {
      await db
        .collection("migration_locks")
        .createIndex({ lock_name: 1 }, { unique: true, name: "lock_name_unique" });
    } catch (e) {}
    return;
  }
  const sql = `CREATE TABLE IF NOT EXISTS \`migrations\` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    checksum VARCHAR(128) DEFAULT NULL,
    batch INT NOT NULL,
    migrated_at DATETIME NOT NULL,
    ran_by VARCHAR(255) DEFAULT NULL,
    ran_host VARCHAR(255) DEFAULT NULL,
    ran_pid INT DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
  await query(sql);

  // migration_locks table for auditing lock ownership
  const lockSql = `CREATE TABLE IF NOT EXISTS \`migration_locks\` (
    lock_name VARCHAR(255) PRIMARY KEY,
    owner VARCHAR(255) DEFAULT NULL,
    owner_pid INT DEFAULT NULL,
    acquired_at DATETIME DEFAULT NULL,
    released_at DATETIME DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
  await query(lockSql);
}

async function acquireLock(lockName: string, timeoutSec = 10, retries = 5, backoffMs = 1000) {
  if (getDbType() === "mongodb") {
    const db = getMongoDb();
    const coll = db.collection("migration_locks");
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        await coll.insertOne({
          lock_name: lockName,
          owner: process.env.USER || os.userInfo().username || null,
          owner_pid: process.pid,
          acquired_at: new Date(),
          released_at: null,
        });
        return; // acquired
      } catch (e: any) {
        if (e && e.code === 11000) {
          if (attempt >= (retries || 1)) break;
          const wait = backoffMs * Math.pow(2, attempt - 1);
          await new Promise((res) => setTimeout(res, wait));
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Could not acquire migration lock '${lockName}' after ${retries} attempts`);
  }
  let attempt = 0;
  while (true) {
    attempt++;
    console.log(
      `Attempting to acquire migration lock '${lockName}' (timeout ${timeoutSec}s) attempt ${attempt}/${retries}`,
    );
    const rows: any[] = await query("SELECT GET_LOCK(?, ?) as got", [lockName, timeoutSec]);
    const got = rows && rows[0] && (rows[0].got === 1 || rows[0].got === "1");
    if (got) {
      console.log(`Acquired migration lock '${lockName}'`);
      // insert/update lock audit
      try {
        const owner = process.env.USER || os.userInfo().username || null;
        const pid = process.pid;
        await query(
          "INSERT INTO `migration_locks` (lock_name, owner, owner_pid, acquired_at, released_at) VALUES (?, ?, ?, NOW(), NULL) ON DUPLICATE KEY UPDATE owner = ?, owner_pid = ?, acquired_at = NOW(), released_at = NULL",
          [lockName, owner, pid, owner, pid],
        );
      } catch (e) {
        console.warn("Failed to record lock acquisition:", e);
      }
      return;
    }
    if (attempt >= retries) break;
    const wait = backoffMs * Math.pow(2, attempt - 1);
    console.log(`Lock not acquired, retrying after ${wait}ms`);
    await new Promise((res) => setTimeout(res, wait));
  }
  throw new Error(`Could not acquire migration lock '${lockName}' after ${retries} attempts`);
}

async function releaseLock(lockName: string) {
  if (getDbType() === "mongodb") {
    const db = getMongoDb();
    try {
      await db.collection("migration_locks").deleteOne({ lock_name: lockName });
    } catch {}
    return;
  }
  try {
    const rows: any[] = await query("SELECT RELEASE_LOCK(?) as released", [lockName]);
    const released = rows && rows[0] && (rows[0].released === 1 || rows[0].released === "1");
    console.log(`Released migration lock '${lockName}' (released=${released})`);
    try {
      await query("UPDATE `migration_locks` SET released_at = NOW() WHERE lock_name = ?", [
        lockName,
      ]);
    } catch (e) {
      /* ignore */
    }
  } catch (e) {
    // ignore
  }
}

function checksumOf(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function parseArgs(argv: string[]) {
  const out: any = {
    command: "up",
    lockName: "rentivo_migrations_lock",
    lockTimeout: 10,
    lockRetries: undefined,
    lockBackoffMs: undefined,
    forceConfirm: false,
    force: false,
    step: 1,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "down" || a === "rollback") out.command = "down";
    else if (a === "up" || a === "migrate") out.command = "up";
    else if (a.startsWith("--step=")) out.step = parseInt(a.split("=")[1], 10) || 1;
    else if (a.startsWith("--lock-name=")) out.lockName = a.split("=")[1];
    else if (a.startsWith("--lock-timeout=")) out.lockTimeout = parseInt(a.split("=")[1], 10) || 10;
    else if (a.startsWith("--lock-retries="))
      out.lockRetries = parseInt(a.split("=")[1], 10) || undefined;
    else if (a.startsWith("--lock-backoff-ms="))
      out.lockBackoffMs = parseInt(a.split("=")[1], 10) || undefined;
    else if (a === "--force-confirm") out.forceConfirm = true;
    else if (a === "--force") out.force = true;
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

async function getAppliedMigrations() {
  if (getDbType() === "mongodb") {
    const db = getMongoDb();
    const rows = await db
      .collection("migrations")
      .find({}, { projection: { _id: 0 } })
      .sort({ migrated_at: 1 })
      .toArray();
    const map: Record<string, any> = {};
    for (const r of rows) map[r.name] = r;
    return { rows, map };
  }
  const rows: any[] = await query(
    "SELECT name, checksum, batch, migrated_at, ran_by, ran_host FROM `migrations` ORDER BY id",
  );
  const map: Record<string, any> = {};
  for (const r of rows) map[r.name] = r;
  return { rows, map };
}

async function getCurrentMaxBatch() {
  if (getDbType() === "mongodb") {
    const db = getMongoDb();
    const row = await db
      .collection("migrations")
      .aggregate([{ $group: { _id: null, maxBatch: { $max: "$batch" } } }])
      .toArray();
    return (row && row[0] && row[0].maxBatch) || 0;
  }
  const rows: any[] = await query("SELECT MAX(batch) as maxBatch FROM `migrations`");
  return (rows && rows[0] && rows[0].maxBatch) || 0;
}

async function runSql(sql: string) {
  if (getDbType() === "mongodb") return; // noop
  // rely on mysql2 pool with multipleStatements enabled
  await query(sql);
}

async function run(inputArgs?: {
  command?: "up" | "down";
  step?: number;
  force?: boolean;
  forceConfirm?: boolean;
  lockName?: string;
  lockTimeout?: number;
  lockRetries?: number;
  lockBackoffMs?: number;
}) {
  await initDatabase();

  // Ensure migrations tables/collections exist BEFORE attempting to acquire a lock.
  await ensureMigrationsTable();

  // Use input args if provided, otherwise parse from process.argv
  // Merge inputArgs with defaults from parseArgs to ensure all fields are present
  const parsedFromArgv = parseArgs(process.argv);
  const args = inputArgs ? { ...parsedFromArgv, ...inputArgs } : parsedFromArgv;

  // checksum policy comes from env var MIGRATION_CHECKSUM_POLICY (strict|warn|ignore)
  const checksumPolicy = (process.env.MIGRATION_CHECKSUM_POLICY || "strict").toLowerCase();

  // lock config: env vars can set defaults, CLI overrides available
  const lockName = args.lockName || process.env.MIGRATION_LOCK_NAME || "rentivo_migrations_lock";
  const lockTimeout =
    args.lockTimeout || parseInt(process.env.MIGRATION_LOCK_TIMEOUT || "10", 10) || 10;
  const lockRetries =
    args.lockRetries || parseInt(process.env.MIGRATION_LOCK_RETRIES || "5", 10) || 5;
  const lockBackoffMs =
    args.lockBackoffMs || parseInt(process.env.MIGRATION_LOCK_BACKOFF_MS || "1000", 10) || 1000;

  await acquireLock(lockName, lockTimeout, lockRetries, lockBackoffMs);

  try {
    await ensureMigrationsTable();

    const dir = path.resolve(process.cwd(), "src/database/migrations");
    // prefer .ts/.js migrations; SQL migrations are deprecated and ignored
    const allFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".js") || f.endsWith(".ts"));
    const bases = new Map<string, string>();
    // prioritize ts, then js
    for (const ext of [".ts", ".js"]) {
      for (const f of allFiles.filter((x) => x.endsWith(ext))) {
        const base = f.replace(/\.(ts|js|sql)$/i, "");
        if (!bases.has(base)) bases.set(base, f);
      }
    }
    const files = Array.from(bases.values()).sort();
    // detect and warn about remaining .sql files so maintainers can remove them
    const legacySql = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));
    if (legacySql.length)
      console.warn("Found legacy .sql migrations (ignored):", legacySql.join(", "));

    if (args.command === "up") {
      const { map } = await getAppliedMigrations();
      const maxBatch = await getCurrentMaxBatch();
      const newBatch = (maxBatch || 0) + 1;

      // pre-scan for checksum mismatches to allow single confirmation
      const mismatches: string[] = [];
      for (const f of files) {
        const full = path.join(dir, f);
        if (!map[f]) continue;
        let content = "";
        try {
          content = fs.readFileSync(full, "utf8");
        } catch (e) {
          content = "";
        }
        const ch = checksumOf(content);
        if (map[f].checksum && map[f].checksum !== ch) mismatches.push(f);
      }

      if (mismatches.length) {
        if (args.force) {
          console.warn(
            "Checksum mismatches detected but --force provided — proceeding for all mismatches:",
            mismatches.join(", "),
          );
        } else if (args.forceConfirm) {
          const ok = await promptConfirm(
            `Checksum mismatches detected for applied migrations: ${mismatches.join(", ")}. Proceed and ignore all mismatches? (y/N)`,
          );
          if (!ok) throw new Error("User aborted due to checksum mismatches");
          console.warn("User confirmed proceeding despite checksum mismatches");
        } else if (checksumPolicy === "ignore") {
          console.warn(
            "Checksum mismatches detected but MIGRATION_CHECKSUM_POLICY=ignore — proceeding. Files:",
            mismatches.join(", "),
          );
        } else if (checksumPolicy === "warn") {
          console.warn(
            "Checksum mismatches detected (policy=warn). These migrations will be skipped:",
            mismatches.join(", "),
          );
        } else {
          throw new Error(
            `Checksum mismatches detected for applied migrations: ${mismatches.join(", ")}. Aborting (set MIGRATION_CHECKSUM_POLICY or use --force/--force-confirm).`,
          );
        }
      }

      for (const f of files) {
        const full = path.join(dir, f);

        // compute checksum of current file
        let content = "";
        try {
          content = fs.readFileSync(full, "utf8");
        } catch (e) {
          content = "";
        }
        const ch = checksumOf(content);

        if (map[f]) {
          // checksum changed since applied → obey checksum policy (already handled in pre-scan)
          if (map[f].checksum && map[f].checksum !== ch) {
            if (args.force || args.forceConfirm || checksumPolicy === "ignore") {
              console.warn(`Proceeding despite checksum mismatch for ${f}`);
            } else if (checksumPolicy === "warn") {
              console.log("Skipping already applied migration", f);
              continue;
            } else {
              throw new Error(
                `Checksum mismatch for already-applied migration ${f}. File was changed after applying. Aborting.`,
              );
            }
          }
          console.log("Skipping already applied migration", f);
          continue;
        }

        console.log("Applying migration", f);
        if (f.endsWith(".js") || f.endsWith(".ts")) {
          const rawMod = await import(pathToFileURL(path.join(dir, f)).href);
          const mod = resolveMigrationModule(rawMod);
          if (mod && typeof mod.up === "function") {
            if (getDbType() === "mongodb") {
              const schema = new MongoSchema();
              await mod.up(schema, undefined);
              await schema.apply();
              const ranBy = process.env.USER || os.userInfo().username || null;
              const ranHost = os.hostname();
              const pid = process.pid;
              await getMongoDb().collection("migrations").insertOne({
                name: f,
                checksum: ch,
                batch: newBatch,
                migrated_at: new Date(),
                ran_by: ranBy,
                ran_host: ranHost,
                ran_pid: pid,
              });
            } else {
              const schema = new Schema();
              const res = await mod.up(schema, query);
              if (typeof res === "string") await runSql(res);
              const ranBy = process.env.USER || os.userInfo().username || null;
              const ranHost = os.hostname();
              const pid = process.pid;
              await query(
                "INSERT INTO `migrations` (name, checksum, batch, migrated_at, ran_by, ran_host, ran_pid) VALUES (?, ?, ?, NOW(), ?, ?, ?)",
                [f, ch, newBatch, ranBy, ranHost, pid],
              );
            }
          } else {
            throw new Error(`Migration ${f} does not export an up(schema, query) function`);
          }
        } else {
          // should not happen due to initial filter; safeguard log
          console.warn("Ignoring unsupported migration file type:", f);
        }
      }

      console.log("Migrations applied (batch", newBatch + ")");
      return;
    }

    // down / rollback (unchanged logic below)
    if (args.command === "down") {
      const step = args.step || 1;
      if (getDbType() === "mongodb") {
        const db = getMongoDb();
        const batches = await db.collection("migrations").distinct("batch");
        const sortedDesc = (batches as number[])
          .filter((x: any) => x != null)
          .sort((a, b) => b - a)
          .slice(0, step);
        if (!sortedDesc.length) {
          console.log("No migrations to rollback");
          return;
        }
        const rows = await db
          .collection("migrations")
          .find({ batch: { $in: sortedDesc } })
          .sort({ migrated_at: -1 })
          .toArray();
        if (!rows.length) {
          console.log("No migrations found for requested batches");
          return;
        }
        const dir2 = path.resolve(process.cwd(), "src/database/migrations");
        for (const r of rows) {
          const f = r.name as string;
          const full = path.join(dir2, f);
          console.log("Reverting migration", f);
          if (fs.existsSync(full) && (f.endsWith(".js") || f.endsWith(".ts"))) {
            const rawMod = await import(pathToFileURL(full).href);
            const mod = resolveMigrationModule(rawMod);
            if (mod && typeof mod.down === "function") {
              const schema = new MongoSchema();
              await mod.down(schema, undefined);
              await schema.apply();
              await db.collection("migrations").deleteOne({ name: f });
              continue;
            } else {
              throw new Error(
                `Migration ${f} does not export a down(schema, query) function; rollback aborted`,
              );
            }
          }
          throw new Error(
            `Cannot rollback migration ${f}: SQL migrations are deprecated. Provide a JS/TS migration with down(schema, query).`,
          );
        }
        console.log("Rollback complete for batches", sortedDesc.join(","));
        return;
      }
      // MySQL path
      const batchesRows: any[] = await query(
        "SELECT DISTINCT batch FROM `migrations` ORDER BY batch DESC",
      );
      if (!batchesRows.length) {
        console.log("No migrations to rollback");
        return;
      }
      const batches = batchesRows.map((r) => r.batch).slice(0, step);
      if (!batches.length) {
        console.log("No batches to rollback");
        return;
      }

      // get migrations in those batches ordered by id desc
      const placeholders = batches.map(() => "?").join(",");
      const rows: any[] = await query(
        `SELECT id, name, checksum, batch FROM \`migrations\` WHERE batch IN (${placeholders}) ORDER BY id DESC`,
        batches,
      );
      if (!rows.length) {
        console.log("No migrations found for requested batches");
        return;
      }

      // rollback in reverse order (last applied first)
      for (const r of rows) {
        const f = r.name;
        const full = path.join(dir, f);
        console.log("Reverting migration", f);
        if (fs.existsSync(full) && (f.endsWith(".js") || f.endsWith(".ts"))) {
          const rawMod = await import(pathToFileURL(full).href);
          const mod = resolveMigrationModule(rawMod);
          if (mod && typeof mod.down === "function") {
            const schema = new Schema();
            const res = await mod.down(schema, query);
            if (typeof res === "string") await runSql(res);
            await query("DELETE FROM `migrations` WHERE name = ?", [f]);
            continue;
          } else {
            throw new Error(
              `Migration ${f} does not export a down(schema, query) function; rollback aborted`,
            );
          }
        }

        // SQL migrations are deprecated and ignored; expect a JS/TS migration with down() implemented
        throw new Error(
          `Cannot rollback migration ${f}: SQL migrations are deprecated. Provide a JS/TS migration with down(schema, query).`,
        );
      }

      console.log("Rollback complete for batches", batches.join(","));
      return;
    }
  } finally {
    try {
      await releaseLock(lockName);
    } catch (e) {
      /* ignore */
    }
  }
}

// Export run function for programmatic use
export { run };
