import { randomUUID } from "crypto";

/*
|--------------------------------------------------------------------------
| Telescope Entry Store
|--------------------------------------------------------------------------
|
| Circular in-memory buffer for all telescope entries. Entries are
| prepended (newest first). Capacity is controlled by TELESCOPE_MAX_ENTRIES.
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

class TelescopeStoreClass {
  private entries: TelescopeEntry[] = [];
  private seq = 0;
  readonly maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  record(type: EntryType, content: Record<string, any>, tags: string[] = []): TelescopeEntry {
    const entry: TelescopeEntry = {
      id: randomUUID(),
      type,
      content,
      tags,
      createdAt: new Date(),
      sequence: ++this.seq,
    };
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) this.entries.pop();
    return entry;
  }

  getEntries(options: GetEntriesOptions = {}): TelescopeEntry[] {
    let result = this.entries;

    if (options.type) result = result.filter((e) => e.type === options.type);
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
  }

  getEntry(id: string): TelescopeEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  clear(type?: EntryType): void {
    if (type) {
      this.entries = this.entries.filter((e) => e.type !== type);
    } else {
      this.entries = [];
    }
  }

  stats(): Partial<Record<EntryType, number>> {
    const counts: Partial<Record<EntryType, number>> = {};
    for (const e of this.entries) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return counts;
  }
}

export const TelescopeStore = new TelescopeStoreClass(
  parseInt(process.env.TELESCOPE_MAX_ENTRIES ?? "1000", 10),
);
