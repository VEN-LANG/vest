import { randomUUID } from "crypto";
import { Cache } from "@lara-node/cache";

/*
|--------------------------------------------------------------------------
| Telescope Entry Store — Cache-backed
|--------------------------------------------------------------------------
|
| Key layout (app prefix added by Cache automatically):
|
|   telescope:entries      → TelescopeEntry[]     ring buffer newest-first
|   telescope:e:{id}       → TelescopeEntry        O(1) individual lookup
|   telescope:mb:req:{ts}  → RequestMinuteBucket   per-minute request metrics
|   telescope:mb:qry:{ts}  → QueryMinuteBucket     per-minute query metrics
|
| Entries have a TTL of `pruneAfterHours` hours — no manual pruning needed.
| Individual entry keys share the same TTL so they expire together.
|
| All write operations are fire-and-forget (best-effort); Telescope is an
| observability layer and must never impact the application on failure.
|
*/

export type EntryType = "request" | "exception" | "job" | "schedule" | "query" | "log" | "cache";

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
  entries:    "telescope:entries",
  entry:      (id: string) => `telescope:e:${id}`,
  reqBucket:  (ts: number) => `telescope:mb:req:${ts}`,
  qryBucket:  (ts: number) => `telescope:mb:qry:${ts}`,
};

class TelescopeStoreClass {
  readonly maxEntries: number;
  private readonly ttlSeconds: number;
  private seq = 0;

  constructor(maxEntries = 1000, pruneAfterHours = 48) {
    this.maxEntries = maxEntries;
    this.ttlSeconds = pruneAfterHours * 3600;
  }

  async record(type: EntryType, content: Record<string, any>, tags: string[] = []): Promise<TelescopeEntry> {
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

    return entry;
  }

  private async persist(entry: TelescopeEntry): Promise<void> {
    try {
      // Ring buffer of all entries (newest first)
      const entries: TelescopeEntry[] = (await Cache.get(K.entries)) ?? [];
      entries.unshift(entry);
      if (entries.length > this.maxEntries) entries.pop();
      await Cache.set(K.entries, entries, this.ttlSeconds);

      // Individual lookup key
      await Cache.set(K.entry(entry.id), entry, this.ttlSeconds);

      // Per-minute metric buckets
      if (entry.type === "request") await this.updateRequestBucket(entry);
      if (entry.type === "query")   await this.updateQueryBucket(entry);
    } catch { /* best-effort */ }
  }

  private async updateRequestBucket(entry: TelescopeEntry): Promise<void> {
    const ts = Math.floor(new Date(entry.createdAt).getTime() / 60_000) * 60_000;
    const key = K.reqBucket(ts);
    const b: RequestMinuteBucket = (await Cache.get(key)) ?? {
      ts, count: 0, totalDuration: 0, errors: 0, durations: [],
    };
    const dur = entry.content.duration ?? 0;
    b.count++;
    b.totalDuration += dur;
    b.durations.push(dur);
    if ((entry.content.status ?? 200) >= 400) b.errors++;
    await Cache.set(key, b, 7200);
  }

  private async updateQueryBucket(entry: TelescopeEntry): Promise<void> {
    const ts = Math.floor(new Date(entry.createdAt).getTime() / 60_000) * 60_000;
    const key = K.qryBucket(ts);
    const b: QueryMinuteBucket = (await Cache.get(key)) ?? {
      ts, count: 0, totalDuration: 0, slowCount: 0,
    };
    const dur = entry.content.duration ?? 0;
    b.count++;
    b.totalDuration += dur;
    if (dur > 100) b.slowCount++;
    await Cache.set(key, b, 7200);
  }

  async getEntries(options: GetEntriesOptions = {}): Promise<TelescopeEntry[]> {
    try {
      let result: TelescopeEntry[] = (await Cache.get(K.entries)) ?? [];

      if (options.type)   result = result.filter((e) => e.type === options.type);
      if (options.tag)    result = result.filter((e) => e.tags.includes(options.tag!));
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
      return (await Cache.get(K.entry(id))) ?? undefined;
    } catch {
      return undefined;
    }
  }

  async clear(type?: EntryType): Promise<void> {
    try {
      if (type) {
        const entries: TelescopeEntry[] = (await Cache.get(K.entries)) ?? [];
        await Cache.set(K.entries, entries.filter((e) => e.type !== type), this.ttlSeconds);
      } else {
        await Cache.del(K.entries);
      }
    } catch { /* best-effort */ }
  }

  async stats(): Promise<Partial<Record<EntryType, number>>> {
    try {
      const entries: TelescopeEntry[] = (await Cache.get(K.entries)) ?? [];
      const counts: Partial<Record<EntryType, number>> = {};
      for (const e of entries) {
        counts[e.type] = (counts[e.type] ?? 0) + 1;
      }
      return counts;
    } catch {
      return {};
    }
  }

  async getRequestBucket(ts: number): Promise<RequestMinuteBucket | null> {
    try {
      return await Cache.get(K.reqBucket(ts));
    } catch {
      return null;
    }
  }

  async getQueryBucket(ts: number): Promise<QueryMinuteBucket | null> {
    try {
      return await Cache.get(K.qryBucket(ts));
    } catch {
      return null;
    }
  }
}

export const TelescopeStore = new TelescopeStoreClass(
  parseInt(process.env.TELESCOPE_MAX_ENTRIES ?? "1000", 10),
  parseInt(process.env.TELESCOPE_PRUNE_HOURS ?? "48", 10),
);
