type Primitive = string | number | boolean | null;
type ConfigValue = Record<string, unknown> | unknown[] | Primitive;

const store: Record<string, ConfigValue> = {};

/**
 * Pluggable cache backend for persisting the resolved config snapshot.
 *
 * Core cannot import `@lara-node/cache` (that package depends on core), so the
 * cache driver is injected at boot. `CacheServiceProvider` calls
 * `setConfigCacheBackend()` wiring the application cache; until then config
 * caching is a no-op and `config()` simply uses the in-memory store.
 */
export interface ConfigCacheBackend {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  forget(key: string): Promise<void>;
}

const CONFIG_CACHE_KEY = "__lara_node_config__";
let configCacheBackend: ConfigCacheBackend | null = null;

/** Wire the cache backend used to persist/restore the config snapshot. */
export function setConfigCacheBackend(backend: ConfigCacheBackend | null): void {
  configCacheBackend = backend;
}

/** True once a cache backend has been wired (CacheServiceProvider booted). */
export function hasConfigCacheBackend(): boolean {
  return configCacheBackend != null;
}

/**
 * Register a config namespace. Later calls overwrite earlier ones,
 * so app configs registered in ConfigServiceProvider override package defaults.
 */
export function setConfig(key: string, value: ConfigValue): void {
  store[key] = value;
}

/**
 * Laravel-style config accessor.
 *
 * @example
 * config('mail.default')         // → 'smtp'
 * config('app.name', 'MyApp')    // → env value or 'MyApp'
 * config('mail')                 // → full mail config object
 */
export function config<T = unknown>(key: string, defaultValue?: T): T {
  const [namespace, ...parts] = key.split(".");
  const ns = store[namespace];

  if (ns === undefined) return defaultValue as T;
  if (parts.length === 0) return ns as T;

  let current: unknown = ns;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || Array.isArray(current)) {
      return defaultValue as T;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return (current !== undefined ? current : defaultValue) as T;
}

/**
 * Check whether a config namespace is registered.
 */
export function hasConfig(key: string): boolean {
  const [namespace] = key.split(".");
  return namespace in store;
}

/**
 * Deep-merge a config object into an existing namespace. Package defaults
 * should call this first; app-level setConfig() still wins because it
 * overwrites the entire namespace.
 *
 * @example
 * // In a package ServiceProvider (sets defaults):
 * mergeConfig('mail', { default: 'smtp', mailers: { smtp: { ... } } });
 * // In ConfigServiceProvider (app wins):
 * setConfig('mail', appMailConfig);
 */
export function mergeConfig(key: string, value: Record<string, unknown>): void {
  const existing = store[key];
  if (existing == null || typeof existing !== "object" || Array.isArray(existing)) {
    store[key] = value;
    return;
  }
  store[key] = deepMerge(existing as Record<string, unknown>, value);
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const output = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (
      v != null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      k in output &&
      output[k] != null &&
      typeof output[k] === "object" &&
      !Array.isArray(output[k])
    ) {
      output[k] = deepMerge(output[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      output[k] = v;
    }
  }
  return output;
}

/**
 * Return a snapshot of all registered config.
 */
export function allConfig(): Record<string, ConfigValue> {
  return { ...store };
}

/**
 * Replace the entire in-memory config store (used when restoring a cached
 * snapshot). Existing namespaces are cleared first.
 */
export function hydrateConfig(snapshot: Record<string, ConfigValue>): void {
  for (const k of Object.keys(store)) delete store[k];
  for (const [k, v] of Object.entries(snapshot)) store[k] = v;
}

/**
 * Persist the current resolved config snapshot to the cache backend.
 * No-op when no backend is wired. Mirrors Laravel's `config:cache`.
 */
export async function cacheConfig(): Promise<boolean> {
  if (!configCacheBackend) return false;
  await configCacheBackend.set(CONFIG_CACHE_KEY, allConfig());
  return true;
}

/**
 * Load a previously cached config snapshot into the in-memory store.
 * Returns true when a snapshot was found and hydrated.
 */
export async function restoreConfigFromCache(): Promise<boolean> {
  if (!configCacheBackend) return false;
  const snapshot = (await configCacheBackend.get(CONFIG_CACHE_KEY)) as
    | Record<string, ConfigValue>
    | null
    | undefined;
  if (!snapshot || typeof snapshot !== "object") return false;
  hydrateConfig(snapshot);
  return true;
}

/** Remove the cached config snapshot. Mirrors Laravel's `config:clear`. */
export async function clearConfigCache(): Promise<boolean> {
  if (!configCacheBackend) return false;
  await configCacheBackend.forget(CONFIG_CACHE_KEY);
  return true;
}
