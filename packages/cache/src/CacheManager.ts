import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import CacheModel from "./Models/Cache.js";

/** Optional watcher hook — registered by @vest/telescope at boot to avoid circular deps. */
type CacheEventType = "get" | "set" | "del" | "has" | "clear";
interface CacheWatchEvent {
  type: CacheEventType;
  key: string;
  hit?: boolean;
  value?: any;
  ttlSeconds?: number | null;
}
let _cacheWatchHook: ((event: CacheWatchEvent) => void) | null = null;
export function setCacheWatchHook(hook: (event: CacheWatchEvent) => void): void {
  _cacheWatchHook = hook;
}
const CacheWatcher = {
  record: (e: CacheWatchEvent) => {
    if (_cacheWatchHook)
      try {
        _cacheWatchHook(e);
      } catch {}
  },
};

// Re-export rate limiter
export {
  RateLimiter,
  RateLimiterFacade,
  RateLimitExceededException,
  defineRateLimiter,
  getNamedLimiter,
} from "./RateLimiter.js";
export type { RateLimiterConfig, RateLimitInfo } from "./RateLimiter.js";

export interface CacheDriver {
  init(): Promise<void>;
  get(key: string): Promise<any | null>;
  set(key: string, value: any, ttlSeconds?: number | null): Promise<void>;
  del(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>; // list raw (unprefixed) keys
}

// Encryption helpers (Laravel-like behavior)
const APP_KEY = process.env.APP_KEY || "";
const CIPHER = "aes-256-cbc";
let ENCRYPTION_ENABLED = false;
let ENCRYPTION_KEY: Buffer | null = null;

function deriveKeyFromAppKey(appKey: string): Buffer {
  if (!appKey) return Buffer.alloc(0);
  if (appKey.startsWith("base64:")) {
    const b = appKey.slice(7);
    return Buffer.from(b, "base64");
  }
  const buf = Buffer.from(appKey, "utf8");
  if (buf.length === 32) return buf;
  // derive 32 bytes via sha256
  return crypto.createHash("sha256").update(buf).digest();
}

if (APP_KEY) {
  try {
    ENCRYPTION_KEY = deriveKeyFromAppKey(APP_KEY);
    if (ENCRYPTION_KEY.length !== 32) {
      console.warn(
        "APP_KEY provided but did not yield 32 bytes; derived key length:",
        ENCRYPTION_KEY.length,
        "— disabling encryption",
      );
      ENCRYPTION_ENABLED = false;
    } else {
      ENCRYPTION_ENABLED = true;
    }
  } catch (e) {
    console.warn("Failed to initialize cache encryption, proceeding without encryption:", e);
    ENCRYPTION_ENABLED = false;
  }
} else {
  // not fatal — allow running without encryption but warn
  console.warn(
    "No APP_KEY set; cache encryption is disabled. Set APP_KEY in your .env to enable encryption of cached values.",
  );
}

function hmacFor(ivB64: string, valueB64: string) {
  if (!ENCRYPTION_KEY) return "";
  return crypto
    .createHmac("sha256", ENCRYPTION_KEY)
    .update(ivB64 + "|" + valueB64)
    .digest("hex");
}

function encryptRaw(plain: string): string {
  if (!ENCRYPTION_ENABLED || !ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) return plain;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(CIPHER, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plain, "utf8")), cipher.final()]);
  const ivB = iv.toString("base64");
  const valB = encrypted.toString("base64");
  const mac = hmacFor(ivB, valB);
  const payload = { iv: ivB, value: valB, mac };
  return JSON.stringify(payload);
}

function decryptRaw(payloadStr: string): string | null {
  if (!ENCRYPTION_ENABLED || !ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) return payloadStr;
  let payload: any;
  try {
    payload = JSON.parse(payloadStr);
  } catch (e) {
    // not encrypted payload
    return null;
  }
  if (!payload || !payload.iv || !payload.value || !payload.mac) return null;
  const expected = hmacFor(payload.iv, payload.value);
  if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(payload.mac, "hex"))) {
    throw new Error("Cache decryption failed: invalid MAC");
  }
  const iv = Buffer.from(payload.iv, "base64");
  const enc = Buffer.from(payload.value, "base64");
  const decipher = crypto.createDecipheriv(CIPHER, ENCRYPTION_KEY as Buffer, iv);
  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
  return decrypted.toString("utf8");
}

const CACHE_PREFIX = process.env.CACHE_PREFIX
  ? String(process.env.CACHE_PREFIX)
  : process.env.APP_NAME || "app";
function prefixed(key: string) {
  if (!CACHE_PREFIX) return key;
  return `${CACHE_PREFIX}:${key}`;
}

function stripPrefix(fullKey: string): string {
  if (!CACHE_PREFIX) return fullKey;
  return fullKey.startsWith(CACHE_PREFIX + ":") ? fullKey.slice(CACHE_PREFIX.length + 1) : fullKey;
}
export function generateCacheKey(
  ...parts: Array<string | number | boolean | Date | null | undefined>
): string {
  const cleaned = parts
    .filter((p) => p !== undefined && p !== null)
    .map((p) => (p instanceof Date ? p.toISOString() : String(p).trim().replace(/\s+/g, "_")));
  return cleaned.join(":"); // unprefixed base key
}

class FileCache implements CacheDriver {
  private dir: string;
  private initialized = false;

  constructor(baseDir?: string) {
    this.dir = baseDir || path.resolve(__dirname, "../../tmp/cache");
  }

  async init() {
    if (this.initialized) return;
    await fs.promises.mkdir(this.dir, { recursive: true });
    this.initialized = true;
  }

  private filePath(key: string) {
    // sanitize key to file-friendly name
    const safe = encodeURIComponent(prefixed(key));
    return path.join(this.dir, `${safe}.json`);
  }

  async get(key: string) {
    await this.init();
    const p = this.filePath(key);
    try {
      const raw = await fs.promises.readFile(p, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        try {
          await fs.promises.unlink(p);
        } catch (e) {}
        return null;
      }
      const stored = parsed.value;
      // attempt decrypt
      if (typeof stored === "string") {
        const dec = decryptRaw(stored);
        if (dec !== null) {
          try {
            return JSON.parse(dec);
          } catch (e) {
            return dec;
          }
        }
        // not encrypted or decryption not enabled: return parsed raw
        return stored;
      }
      return parsed.value;
    } catch (e) {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number | null) {
    await this.init();
    const p = this.filePath(key);
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    const toStore = typeof value === "string" ? value : JSON.stringify(value);
    const payloadVal = encryptRaw(toStore);
    const payload = { value: payloadVal, expiresAt };
    await fs.promises.writeFile(p, JSON.stringify(payload), "utf8");
  }

  async del(key: string) {
    await this.init();
    const p = this.filePath(key);
    try {
      await fs.promises.unlink(p);
      return true;
    } catch (e) {
      return false;
    }
  }

  async has(key: string) {
    const v = await this.get(key);
    return v !== null && v !== undefined;
  }

  async clear() {
    await this.init();
    const files = await fs.promises.readdir(this.dir);
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(this.dir, f)).catch(() => {})));
  }

  async keys() {
    await this.init();
    const files = await fs.promises.readdir(this.dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => decodeURIComponent(f.replace(/\.json$/, "")))
      .map(stripPrefix);
  }
}

class DBCache implements CacheDriver {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    // Assume migrations create table; avoid raw DDL here.
    this.initialized = true;
  }

  private now() {
    return Date.now();
  }

  async get(key: string) {
    await this.init();
    const record: any = await (CacheModel as any).where("k", prefixed(key)).first();
    if (!record) return null;
    const expiresAt = record.getAttribute ? record.getAttribute("expires_at") : record.expires_at;
    if (expiresAt && this.now() > Number(expiresAt)) {
      await this.del(key);
      return null;
    }
    let rawVal = record.getAttribute ? record.getAttribute("v") : record.v;
    if (typeof rawVal === "string") {
      const dec = decryptRaw(rawVal);
      if (dec !== null) {
        try {
          return JSON.parse(dec);
        } catch {
          return dec;
        }
      }
      try {
        return JSON.parse(rawVal);
      } catch {
        return rawVal;
      }
    }
    return rawVal;
  }

  async set(key: string, value: any, ttlSeconds?: number | null) {
    await this.init();
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    const stored = encryptRaw(raw);
    let record: any = await (CacheModel as any).where("k", prefixed(key)).first();
    if (record) {
      // update existing
      if (record.setAttribute) {
        record.setAttribute("v", stored);
        record.setAttribute("expires_at", expiresAt);
        await record.save();
      } else {
        record.v = stored;
        record.expires_at = expiresAt;
        await record.save();
      }
    } else {
      // create new
      await (CacheModel as any).create({ k: prefixed(key), v: stored, expires_at: expiresAt });
    }
  }

  async del(key: string) {
    await this.init();
    const record: any = await (CacheModel as any).where("k", prefixed(key)).first();
    if (!record) return false;
    await record.delete(true); // force physical delete (no soft deletes configured)
    return true;
  }

  async has(key: string) {
    const v = await this.get(key);
    return v !== null && v !== undefined;
  }

  async clear() {
    await this.init();
    const all: any[] = await (CacheModel as any).query().get();
    for (const rec of all) {
      try {
        await rec.delete(true);
      } catch {}
    }
  }

  async keys() {
    await this.init();
    const rows: any[] = await (CacheModel as any).query().get();
    return rows.map((r) => (r.getAttribute ? r.getAttribute("k") : r.k)).map(stripPrefix);
  }
}

class RedisCache implements CacheDriver {
  private client: any = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    let createClient: any;
    try {
      const redis = await import("redis");
      createClient = redis.createClient;
    } catch (e) {
      throw new Error(
        'Redis driver selected (CACHE_DRIVER=redis) but "redis" package is not installed. Install it with `npm install redis`.',
      );
    }

    const redisUrl = process.env.REDIS_URL || undefined;
    const host = process.env.REDIS_HOST || undefined;
    const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined;
    const password = process.env.REDIS_PASSWORD || undefined;

    const opts: any = {};
    if (redisUrl) opts.url = redisUrl;
    if (host) {
      opts.socket = { host };
      if (port) opts.socket.port = port;
    }
    if (password) opts.password = password;

    this.client = createClient(opts);
    if (typeof this.client.connect === "function") {
      await this.client.connect();
    }
    this.initialized = true;
  }

  async get(key: string) {
    await this.init();
    const res = await this.client.get(prefixed(key));
    if (res === null) return null;
    const dec = decryptRaw(res);
    if (dec !== null) {
      try {
        return JSON.parse(dec);
      } catch (e) {
        return dec;
      }
    }
    try {
      return JSON.parse(res);
    } catch (e) {
      return res;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number | null) {
    await this.init();
    const v = typeof value === "string" ? value : JSON.stringify(value);
    const stored = encryptRaw(v);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(prefixed(key), stored, { EX: ttlSeconds });
    } else {
      await this.client.set(prefixed(key), stored);
    }
  }

  async del(key: string) {
    await this.init();
    const n = await this.client.del(prefixed(key));
    return n > 0;
  }

  async has(key: string) {
    await this.init();
    const exists = await this.client.exists(prefixed(key));
    return exists === 1 || exists === true || exists > 0;
  }

  async clear() {
    await this.init();
    // Use SCAN + DEL scoped to our prefix instead of FLUSHDB
    // FLUSHDB is dangerous in shared Redis environments as it wipes ALL keys
    const pattern = CACHE_PREFIX ? `${CACHE_PREFIX}:*` : "*";
    let cursor = "0";
    do {
      const res = await this.client.scan(cursor, { MATCH: pattern, COUNT: 200 });
      cursor = res.cursor || res[0];
      const keys = res.keys || res[1];
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } while (cursor !== "0" && String(cursor) !== "0");
  }

  async keys() {
    await this.init();
    // Use SCAN for safety (avoid KEYS on large datasets)
    const pattern = CACHE_PREFIX ? `${CACHE_PREFIX}:*` : "*";
    const out: string[] = [];
    let cursor = "0";
    do {
      const res = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = res.cursor || res[0];
      const keys = res.keys || res[1];
      for (const k of keys) out.push(stripPrefix(k));
    } while (cursor !== "0");
    return out;
  }
}

class CacheManager implements CacheDriver {
  private driver: CacheDriver | null = null;
  private initializing: Promise<void> | null = null;

  private createDriver(): CacheDriver {
    const driver = (process.env.CACHE_DRIVER || "file").toLowerCase();
    if (driver === "redis") return new RedisCache();
    if (driver === "database" || driver === "db") return new DBCache();
    return new FileCache();
  }

  private async ensureInit() {
    if (this.driver) return;
    if (!this.initializing) {
      this.driver = this.createDriver();
      this.initializing = (async () => {
        await this.driver!.init();
        this.initializing = null;
      })();
    }
    await this.initializing;
  }

  async init() {
    await this.ensureInit();
  }

  async get(key: string) {
    await this.ensureInit();
    return this.driver!.get(key);
  }

  async set(key: string, value: any, ttlSeconds?: number | null) {
    await this.ensureInit();
    return this.driver!.set(key, value, ttlSeconds);
  }

  async del(key: string) {
    await this.ensureInit();
    return this.driver!.del(key);
  }

  async has(key: string) {
    await this.ensureInit();
    return this.driver!.has(key);
  }

  async clear() {
    await this.ensureInit();
    return this.driver!.clear();
  }

  async keys() {
    await this.ensureInit();
    return this.driver!.keys();
  }
}

// Export a singleton instance
const manager = new CacheManager();
export default manager;

// Cache facade for convenient access
export const Cache = {
  get: async (k: string) => {
    const value = await manager.get(k);
    CacheWatcher.record({ type: "get", key: k, hit: value !== null, value });
    return value;
  },
  set: async (k: string, v: any, ttlSeconds?: number | null) => {
    await manager.set(k, v, ttlSeconds);
    CacheWatcher.record({ type: "set", key: k, value: v, ttlSeconds });
  },
  del: async (k: string) => {
    const result = await manager.del(k);
    CacheWatcher.record({ type: "del", key: k });
    return result;
  },
  has: async (k: string) => {
    const result = await manager.has(k);
    CacheWatcher.record({ type: "has", key: k, hit: result });
    return result;
  },
  clear: async () => {
    await manager.clear();
    CacheWatcher.record({ type: "clear", key: "" });
  },
  keys: () => manager.keys(),
  forget: async (k: string) => {
    const result = await manager.del(k);
    CacheWatcher.record({ type: "del", key: k });
    return result;
  },
  flush: async () => {
    await manager.clear();
    CacheWatcher.record({ type: "clear", key: "" });
  },
  remember: async <T>(
    key: string,
    ttlSeconds: number | null,
    callback: () => Promise<T>,
  ): Promise<T> => {
    const cached = await manager.get(key);
    if (cached !== null) {
      CacheWatcher.record({ type: "get", key, hit: true, value: cached, ttlSeconds });
      return cached as T;
    }
    CacheWatcher.record({ type: "get", key, hit: false, ttlSeconds });
    const value = await callback();
    await manager.set(key, value, ttlSeconds);
    CacheWatcher.record({ type: "set", key, value, ttlSeconds });
    return value;
  },
};

// Get cache driver name
export const getCacheDriverName = (): string => {
  return (process.env.CACHE_DRIVER || "file").toLowerCase();
};

// Get cache driver instance
export const getCacheDriver = () => manager;

// Convenience named exports
export const initCache = async () => manager.init();
export const cacheGet = async (k: string) => manager.get(k);
export const cacheSet = async (k: string, v: any, ttlSeconds?: number | null) =>
  manager.set(k, v, ttlSeconds);
export const cacheDel = async (k: string) => manager.del(k);
export const cacheHas = async (k: string) => manager.has(k);
export const cacheClear = async () => manager.clear();
export const cacheKeys = async () => manager.keys();

// Delete all cache keys that start with the provided (unprefixed) prefix.
// Returns number of keys deleted.
export const cacheDelPrefix = async (prefix: string): Promise<number> => {
  // manager.keys() returns unprefixed keys (stripPrefix applied in drivers)
  const keys = await manager.keys();
  const matches = keys.filter((k) => k.startsWith(prefix));
  await Promise.all(matches.map((k) => manager.del(k).catch(() => {})));
  return matches.length;
};
