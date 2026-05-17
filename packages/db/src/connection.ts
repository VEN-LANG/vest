import mysql from "mysql2/promise";
import fs from "fs";
import { MongoClient, Db, Collection, Document } from "mongodb";
import { createMongoQueryProxy } from "./QueryInstrumentation.js";

// MySQL state
let pool: mysql.Pool | undefined;

// Mongo state
let mongoClient: MongoClient | undefined;
let mongoDb: Db | undefined;

// All env vars are read inside functions (not at module evaluation time) so that
// dotenv has a chance to populate process.env before these values are captured.
// This fixes the "pnpm start" / CJS bundle scenario where the bundle is evaluated
// before dotenv/config runs.

function readDbType(): "mysql" | "mongodb" {
  return (
    (process.env.DB_CONNECTION || process.env.DB_DRIVER || "mysql").toLowerCase() as
      | "mysql"
      | "mongodb"
  );
}

function readMysqlCfg() {
  return {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "test",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    socketPath: process.env.DB_SOCKET_PATH || process.env.DB_SOCKET || undefined,
    poolLimit: parseInt(process.env.DB_POOL_LIMIT || "10", 10),
  };
}

function ensureMysqlPool() {
  if (pool) return pool;
  const cfg = readMysqlCfg();
  const baseOptions: mysql.PoolOptions = {
    waitForConnections: true,
    connectionLimit: cfg.poolLimit,
    queueLimit: 0,
    multipleStatements: true,
  };
  pool = mysql.createPool(
    cfg.socketPath
      ? {
          ...baseOptions,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          socketPath: cfg.socketPath,
        }
      : {
          ...baseOptions,
          host: cfg.host,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          port: cfg.port,
        },
  );
  return pool;
}

export function getDbType(): "mysql" | "mongodb" {
  return readDbType();
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (readDbType() === "mysql") {
    const p = ensureMysqlPool();
    const [rows] = await p.query(sql, params);
    return rows as T[];
  }
  throw new Error(
    "query(sql, params) is not supported for MongoDB. Use the Mongo helpers (collection, getMongoDb).",
  );
}

export async function initDatabase(): Promise<void> {
  const dbType = readDbType();

  if (dbType === "mysql") {
    const cfg = readMysqlCfg();
    let conn: mysql.PoolConnection | undefined;
    try {
      const p = ensureMysqlPool();
      conn = await p.getConnection();
      await conn.ping();
    } catch (err: unknown) {
      const triedSockets: string[] = [];
      if (!cfg.socketPath) {
        const commonSocketPaths = [
          "/var/run/mysqld/mysqld.sock",
          "/tmp/mysql.sock",
          "/var/lib/mysql/mysql.sock",
        ];
        for (const pth of commonSocketPaths) {
          try {
            if (!fs.existsSync(pth)) continue;
            triedSockets.push(pth);
            const baseOptions: mysql.PoolOptions = {
              waitForConnections: true,
              connectionLimit: cfg.poolLimit,
              queueLimit: 0,
              multipleStatements: true,
            };
            pool = mysql.createPool({
              ...baseOptions,
              user: cfg.user,
              password: cfg.password,
              database: cfg.database,
              socketPath: pth,
            });
            conn = await pool.getConnection();
            await conn.ping();
            return;
          } catch {
            continue;
          } finally {
            if (conn) {
              try {
                conn.release();
              } catch {
                /* noop */
              }
              conn = undefined;
            }
          }
        }
        if (triedSockets.length) {
          (err as Error).message =
            `${(err as Error).message} (attempted sockets: ${triedSockets.join(", ")})`;
        }
      }
      const hintLines: string[] = [];
      const e = err as Error & { code?: string };
      if (e && e.code && String(e.code).startsWith("ER_ACCESS_DENIED")) {
        hintLines.push(
          "Access denied: verify DB_USER/DB_PASSWORD and that the user has permissions on DB_NAME.",
          "On many Linux setups, MySQL 'root' uses auth_socket and can't login with a blank password.",
          "Either create a dedicated user, set a proper password, or use DB_SOCKET_PATH if using a local socket.",
        );
      }
      if (!process.env.DB_USER)
        hintLines.push(
          "DB_USER is not set in your environment/.env; set it (e.g., DB_USER=rentivo)",
        );
      if (!cfg.database)
        hintLines.push("DB_NAME is empty; set it in your .env (e.g., DB_NAME=rentivo).");
      if (!cfg.socketPath && !cfg.host)
        hintLines.push("DB_HOST is empty; set DB_HOST or DB_SOCKET_PATH in your .env.");
      const help = hintLines.length ? `\nHints:\n- ${hintLines.join("\n- ")}` : "";
      const safeTarget = cfg.socketPath
        ? `socket ${cfg.socketPath}`
        : `${cfg.host}${cfg.port ? ":" + cfg.port : ""}`;
      throw new Error(
        `Database ping failed for ${safeTarget} as '${cfg.user}' on schema '${cfg.database}'. Original: ${(err as Error)?.message || err}${help}`,
      );
    } finally {
      if (conn) conn.release();
    }
    return;
  }

  // MongoDB init
  if (mongoDb) return;
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 27017;
  const dbName = process.env.DB_NAME || "test";
  const mongoUri =
    process.env.MONGO_URI || process.env.MONGODB_URI || `mongodb://${dbHost}:${dbPort}`;

  const replicaSet = process.env.MONGO_REPLICA_SET || undefined;
  const isReplicaSet = !!replicaSet || process.env.MONGO_DIRECT_CONNECTION === "false";

  const directConnection =
    process.env.MONGO_DIRECT_CONNECTION === "true"
      ? true
      : process.env.MONGO_DIRECT_CONNECTION === "false"
        ? false
        : !isReplicaSet;

  const retryWrites =
    process.env.MONGO_RETRY_WRITES === "true"
      ? true
      : process.env.MONGO_RETRY_WRITES === "false"
        ? false
        : isReplicaSet;

  const clientOptions: Record<string, unknown> = {
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000", 10),
    retryWrites,
  };

  if (!isReplicaSet) {
    clientOptions.directConnection = directConnection;
  }

  if (replicaSet) {
    clientOptions.replicaSet = replicaSet;
  }

  const client = new MongoClient(mongoUri, clientOptions as ConstructorParameters<typeof MongoClient>[1]);
  await client.connect();
  mongoClient = client;
  mongoDb = client.db(dbName);
  await mongoDb.command({ ping: 1 });
}

export function getPool() {
  if (readDbType() !== "mysql") throw new Error("getPool() only valid for MySQL");
  return ensureMysqlPool();
}

export function getMongoDb(): Db {
  if (readDbType() !== "mongodb") throw new Error("getMongoDb() only valid for MongoDB");
  if (!mongoDb) throw new Error("MongoDB not initialized. Call initDatabase() first.");
  return mongoDb;
}

export function collection(name: string): Collection<Document> {
  const col: Collection<Document> = getMongoDb().collection(name);
  return createMongoQueryProxy(name, col) as Collection<Document>;
}

export function __setMongoDbForTest(db: Db | undefined): void {
  mongoDb = db;
}

export function __setPoolForTest(p: mysql.Pool | undefined): void {
  pool = p;
}

export async function closeDatabase(): Promise<void> {
  if (readDbType() === "mysql") {
    if (pool) await pool.end();
    pool = undefined;
    return;
  }
  if (mongoClient) await mongoClient.close();
  mongoClient = undefined;
  mongoDb = undefined;
}
