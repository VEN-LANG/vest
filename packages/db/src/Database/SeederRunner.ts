import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
import {
  initDatabase,
  query,
  getDbType,
  getMongoDb,
  collection as mongoCollection,
} from "../connection.js";

const _cjsRequire = createRequire(process.cwd() + "/package.json");

async function loadFile(filePath: string): Promise<unknown> {
  if (filePath.endsWith(".ts")) return _cjsRequire(filePath);
  return import(pathToFileURL(filePath).href);
}

export interface SeederOptions {
  class?: string;
  force?: boolean;
}

function parseArgs(argv: string[]): SeederOptions {
  const out: SeederOptions = { class: undefined, force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--class=")) out.class = a.split("=")[1];
    else if (a === "--class" && argv[i + 1]) {
      out.class = argv[i + 1];
      i++;
    } else if (a === "--force" || a === "-f") out.force = true;
  }
  return out;
}

type SqlSeederCtx = { type: "mysql"; query: typeof query };
type MongoSeederCtx = { type: "mongodb"; db: any; collection: (name: string) => any };
type SeederCtx = SqlSeederCtx | MongoSeederCtx;

function makeSeederContext(): SeederCtx {
  const t = getDbType();
  if (t === "mongodb") {
    const db = getMongoDb();
    return { type: "mongodb", db, collection: (name: string) => mongoCollection(name) };
  }
  return { type: "mysql", query };
}

async function loadAndRunSeeder(filePath: string) {
  const mod = await loadFile(filePath);
  const fn = mod && (mod.seed || mod.default || mod.run || mod);
  if (typeof fn === "function") {
    const wantsArg = fn.length >= 1;
    let arg: any = undefined;
    if (wantsArg) {
      const t = getDbType();
      if (t === "mysql") arg = query;
      else arg = makeSeederContext();
    }
    const res = wantsArg ? fn(arg) : fn();
    if (res && typeof res.then === "function") await res;
    return true;
  }
  return false;
}

export async function run(inputOptions?: SeederOptions) {
  await initDatabase();

  const parsedArgs = parseArgs(process.argv);
  const opts: SeederOptions = inputOptions ? { ...parsedArgs, ...inputOptions } : parsedArgs;

  const seederClass = opts.class;
  const dir = path.resolve(process.cwd(), "src/database/seeders");

  if (!fs.existsSync(dir)) {
    console.warn("No seeders directory found:", dir);
    return;
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();

  if (seederClass) {
    const targetBase = seederClass.replace(/Seeder$/i, "");
    const match = files.find(
      (f) =>
        f.replace(/\.(ts|js)$/i, "").toLowerCase() === seederClass.toLowerCase() ||
        f.replace(/\.(ts|js)$/i, "").toLowerCase() === targetBase.toLowerCase() + "seeder",
    );
    if (!match) throw new Error(`Seeder class ${seederClass} not found in ${dir}`);
    const full = path.join(dir, match);
    console.log(`Running seeder: ${match}`);
    const ok = await loadAndRunSeeder(full);
    if (!ok) console.warn("Seeder did not export a callable function:", full);
    return;
  }

  const dbSeederFile = files.find(
    (f) => f.replace(/\.(ts|js)$/i, "").toLowerCase() === "databaseseeder",
  );
  if (dbSeederFile) {
    const full = path.join(dir, dbSeederFile);
    console.log("Running DatabaseSeeder...");
    await loadAndRunSeeder(full);
    return;
  }

  console.log(`Running all ${files.length} seeders...`);
  for (const f of files) {
    const full = path.join(dir, f);
    console.log("Running seeder", f);
    try {
      const ok = await loadAndRunSeeder(full);
      if (!ok) console.warn("Seeder did not export a callable function:", f);
    } catch (e) {
      console.error("Seeder failed", f, e);
      throw e;
    }
  }

  console.log("All seeders completed successfully.");
}

export async function runWithOptions(options: SeederOptions): Promise<void> {
  return run(options);
}
