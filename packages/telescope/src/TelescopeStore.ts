import { randomUUID } from "crypto";
import { Cache } from "@lara-node/cache";
import { Broadcast } from "@lara-node/events";
import { getTelescopeConfig } from "./telescope.config.js";

/*
|--------------------------------------------------------------------------
| Telescope Entry Store — Cache-backed, partitioned by entry type
|--------------------------------------------------------------------------
|
| Key layout (app prefix added by Cache automatically) — one ring-buffer key
| PER ENTRY TYPE, so the file-cache driver keeps a small, bounded set of files
| and a write only rewrites the (smaller) buffer for its own type:
|
|   telescope:entries:request    → TelescopeEntry[]   newest-first, capped
|   telescope:entries:query      → TelescopeEntry[]
|   telescope:entries:log        → TelescopeEntry[]
|   …one per EntryType…
|   telescope:mb:req             → Record<ts, RequestMinuteBucket>   rolling metrics
|   telescope:mb:qry             → Record<ts, QueryMinuteBucket>     rolling metrics
|
| Why per-type (not one giant key, not one-file-per-entry):
|   • one giant key  → every watcher rewrites a huge array on each event, and
|     concurrent fire-and-forget writes clobber each other (lost updates);
|   • one-file-per-entry → thousands of cache files on the file driver.
|   Per-type buffers bound the file count, shrink each write, and stop
|   cross-type clobbering. A per-key async lock serialises the read-modify-write
|   so same-type concurrent records can't lose updates either.
|
| Entries carry a TTL of `pruneAfterHours` hours — no manual pruning needed.
| All writes are fire-and-forget; Telescope must never impact the app on failure.
|
*/

export type EntryType = "request" | "exception" | "job" | "schedule" | "query" | "log" | "cache";

export const ENTRY_TYPES: EntryType[] = [
  "request",
  "exception",
  "job",
  "schedule",
  "query",
  "log",
  "cache",
];

export interface TelescopeEntry {
  id: string;
  type: EntryType;
  content: Record<string, any>;
  tags: string[];
  createdAt: Date;
  sequence: number;
}

export interface GetEntriesOptions {
  type?: EntryType;
  limit?: number;
  before?: string;
  tag?: string;
  search?: string;
}

export interface RequestMinuteBucket {
  ts: number;
  count: number;
  totalDuration: number;
  errors: number;
  durations: number[];
}

export interface QueryMinuteBucket {
  ts: number;
  count: number;
  totalDuration: number;
  slowCount: number;
}

const K = {
  entries: (type: EntryType) => `telescope:entries:${type}`,
  reqBuckets: "telescope:mb:req",
  qryBuckets: "telescope:mb:qry",
};

/** How many of the most recent per-minute buckets to retain in the rolling map. */
const MAX_BUCKET_MINUTES = 180;
/** TTL for the metric-bucket maps (seconds). */
const BUCKET_TTL = 7200;

class TelescopeStoreClass {
  private seq = 0;

  /** Serialises read-modify-write per cache key so concurrent records don't clobber. */
  private locks = new Map<string, Promise<unknown>>();

  /** Per-type ring-buffer cap — read from config('telescope') so app overrides win. */
  get maxEntries(): number {
    return getTelescopeConfig().maxEntries;
  }

  /** Entry TTL in seconds, derived from config('telescope.pruneAfterHours'). */
  private get ttlSeconds(): number {
    return getTelescopeConfig().pruneAfterHours * 3600;
  }

  /** Run `fn` after any in-flight operation on `key` has settled (serialised). */
  private withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    // Keep a swallowed tail so a rejection never breaks the chain.
    this.locks.set(
      key,
      run.then(
        () => {},
        () => {},
      ),
    );
    return run;
  }

  /** Keep only the newest MAX_BUCKET_MINUTES entries of a ts→bucket map. */
  private trimBuckets<T>(map: Record<number, T>): Record<number, T> {
    const keys = Object.keys(map)
      .map(Number)
      .sort((a, b) => b - a);
    if (keys.length <= MAX_BUCKET_MINUTES) return map;
    const trimmed: Record<number, T> = {};
    for (const ts of keys.slice(0, MAX_BUCKET_MINUTES)) trimmed[ts] = map[ts];
    return trimmed;
  }

  async record(
    type: EntryType,
    content: Record<string, any>,
    tags: string[] = [],
  ): Promise<TelescopeEntry> {
    const entry: TelescopeEntry = {
      id: randomUUID(),
      type,
      content,
      tags,
      createdAt: new Date(),
      sequence: ++this.seq,
    };

    // Fire-and-forget — never block or throw into caller
    this.persist(entry).catch(() => {});

    // Push live to the `telescope` WebSocket channel (best-effort; no-op when
    // broadcasting isn't running). Same process as the watchers, so this is direct.
    try {
      void Broadcast.to("telescope").send("entry", entry as any).catch(() => {});
    } catch {
      /* broadcasting not initialised */
    }

    return entry;
  }

  private async persist(entry: TelescopeEntry): Promise<void> {
    const key = K.entries(entry.type);
    await this.withLock(key, async () => {
      const entries: TelescopeEntry[] = (await Cache.get(key)) ?? [];
      entries.unshift(entry);
      if (entries.length > this.maxEntries) entries.length = this.maxEntries;
      await Cache.set(key, entries, this.ttlSeconds);
    }).catch(() => {});

    if (entry.type === "request") await this.updateRequestBucket(entry).catch(() => {});
    if (entry.type === "query") await this.updateQueryBucket(entry).catch(() => {});
  }

  private async updateRequestBucket(entry: TelescopeEntry): Promise<void> {
    await this.withLock(K.reqBuckets, async () => {
      const ts = Math.floor(new Date(entry.createdAt).getTime() / 60_000) * 60_000;
      const map: Record<number, RequestMinuteBucket> = (await Cache.get(K.reqBuckets)) ?? {};
      const b: RequestMinuteBucket = map[ts] ?? {
        ts,
        count: 0,
        totalDuration: 0,
        errors: 0,
        durations: [],
      };
      const dur = entry.content.duration ?? 0;
      b.count++;
      b.totalDuration += dur;
      b.durations.push(dur);
      if ((entry.content.status ?? 200) >= 400) b.errors++;
      map[ts] = b;
      await Cache.set(K.reqBuckets, this.trimBuckets(map), BUCKET_TTL);
    });
  }

  private async updateQueryBucket(entry: TelescopeEntry): Promise<void> {
    await this.withLock(K.qryBuckets, async () => {
      const ts = Math.floor(new Date(entry.createdAt).getTime() / 60_000) * 60_000;
      const map: Record<number, QueryMinuteBucket> = (await Cache.get(K.qryBuckets)) ?? {};
      const b: QueryMinuteBucket = map[ts] ?? {
        ts,
        count: 0,
        totalDuration: 0,
        slowCount: 0,
      };
      const dur = entry.content.duration ?? 0;
      b.count++;
      b.totalDuration += dur;
      if (dur > 100) b.slowCount++;
      map[ts] = b;
      await Cache.set(K.qryBuckets, this.trimBuckets(map), BUCKET_TTL);
    });
  }

  /** Read the ring buffer for one type (newest-first). */
  private async readType(type: EntryType): Promise<TelescopeEntry[]> {
    return ((await Cache.get(K.entries(type))) as TelescopeEntry[]) ?? [];
  }

  async getEntries(options: GetEntriesOptions = {}): Promise<TelescopeEntry[]> {
    try {
      let result: TelescopeEntry[];

      if (options.type) {
        result = await this.readType(options.type);
      } else {
        // Merge across all type buffers, newest-first.
        const buffers = await Promise.all(ENTRY_TYPES.map((t) => this.readType(t)));
        result = buffers.flat();
        result.sort((a, b) => {
          const ta = new Date(a.createdAt).getTime();
          const tb = new Date(b.createdAt).getTime();
          return tb - ta || b.sequence - a.sequence;
        });
      }

      if (options.tag) result = result.filter((e) => e.tags.includes(options.tag!));
      if (options.search) {
        const q = options.search.toLowerCase();
        result = result.filter(
          (e) =>
            JSON.stringify(e.content).toLowerCase().includes(q) ||
            e.tags.some((t) => t.toLowerCase().includes(q)),
        );
      }
      if (options.before) {
        const idx = result.findIndex((e) => e.id === options.before);
        if (idx !== -1) result = result.slice(idx + 1);
      }

      return result.slice(0, options.limit ?? 100);
    } catch {
      return [];
    }
  }

  async getEntry(id: string): Promise<TelescopeEntry | undefined> {
    try {
      for (const type of ENTRY_TYPES) {
        const found = (await this.readType(type)).find((e) => e.id === id);
        if (found) return found;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async clear(type?: EntryType): Promise<void> {
    try {
      if (type) {
        await Cache.del(K.entries(type));
      } else {
        await Promise.all(ENTRY_TYPES.map((t) => Cache.del(K.entries(t))));
      }
    } catch {
      /* best-effort */
    }
  }

  async stats(): Promise<Partial<Record<EntryType, number>>> {
    try {
      const counts: Partial<Record<EntryType, number>> = {};
      await Promise.all(
        ENTRY_TYPES.map(async (t) => {
          const len = (await this.readType(t)).length;
          if (len) counts[t] = len;
        }),
      );
      return counts;
    } catch {
      return {};
    }
  }

  async getRequestBucket(ts: number): Promise<RequestMinuteBucket | null> {
    try {
      const map: Record<number, RequestMinuteBucket> = (await Cache.get(K.reqBuckets)) ?? {};
      return map[ts] ?? null;
    } catch {
      return null;
    }
  }

  async getQueryBucket(ts: number): Promise<QueryMinuteBucket | null> {
    try {
      const map: Record<number, QueryMinuteBucket> = (await Cache.get(K.qryBuckets)) ?? {};
      return map[ts] ?? null;
    } catch {
      return null;
    }
  }
}

export const TelescopeStore = new TelescopeStoreClass();
