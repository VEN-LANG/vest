type Primitive = string | number | boolean | null;
type ConfigValue = Record<string, unknown> | unknown[] | Primitive;

const store: Record<string, ConfigValue> = {};

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
 * Return a snapshot of all registered config.
 */
export function allConfig(): Record<string, ConfigValue> {
  return { ...store };
}
