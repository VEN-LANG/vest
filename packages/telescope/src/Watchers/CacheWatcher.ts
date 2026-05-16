import { TelescopeStore } from "../TelescopeStore.js";
import telescopeConfig from "../telescope.config.js";


export interface CacheRecord {
  type: "get" | "set" | "del" | "has" | "clear" | "remember";
  key: string;
  hit?: boolean;
  value?: any;
  ttlSeconds?: number | null;
}

function truncateValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return value.length > 500 ? value.slice(0, 500) + "..." : value;
  }
  try {
    const str = JSON.stringify(value);
    if (str.length > 500) return str.slice(0, 500) + "...";
    return value;
  } catch {
    return String(value).slice(0, 500);
  }
}

export const CacheWatcher = {
  record(data: CacheRecord): void {
    if (!telescopeConfig.watchers.cache) return;

    const tags: string[] = [];
    if (data.type === "get" || data.type === "has") {
      tags.push(data.hit ? "hit" : "miss");
    }

    TelescopeStore.record(
        "cache",
        {
          type: data.type,
          key: data.key,
          hit: data.hit ?? null,
          value: data.value !== undefined ? truncateValue(data.value) : null,
          ttlSeconds: data.ttlSeconds ?? null,
        },
        tags,
    );
  },
};
