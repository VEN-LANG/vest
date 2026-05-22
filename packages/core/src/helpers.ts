import { inspect } from "util";

/**
 * Laravel-style dump and die.
 *
 * Pretty-prints all arguments to stdout and terminates the process.
 *
 * @example
 * dd(user);
 * dd('label', request.body, response);
 */
export function dd(...values: unknown[]): never {
  for (const value of values) {
    process.stdout.write(
      inspect(value, { depth: 8, colors: true, compact: false }) + "\n",
    );
  }
  process.exit(1);
}

/**
 * Create a deep clone of any value, including class instances and functions.
 *
 * Handles:
 * - Primitives (string, number, boolean, null, undefined, bigint, symbol)
 * - Plain objects and class instances — prototype chain preserved, `instanceof` works
 * - Functions — returns a new function that delegates to the original;
 *   own properties (e.g. `fn.meta = {...}`) are deep-cloned
 * - Arrays, Date, RegExp, Map, Set
 * - ArrayBuffer, TypedArrays (Float32Array, Uint8Array, …), DataView
 * - Symbol-keyed properties
 * - Circular references
 *
 * Getters and setters are preserved as descriptors rather than being invoked.
 *
 * @example
 * // Plain objects
 * const copy = clone({ a: { b: 1 } });
 *
 * // Class instances — prototype is preserved
 * class Point { constructor(public x: number, public y: number) {} }
 * const p2 = clone(new Point(1, 2));
 * console.log(p2 instanceof Point); // true
 *
 * // Functions
 * const fn = (x: number) => x * 2;
 * fn.meta = { version: 1 };
 * const fn2 = clone(fn);
 * fn2.meta.version = 99;
 * console.log(fn.meta.version); // 1 — independent copy
 */
export function clone<T>(value: T): T {
  return deepClone(value, new WeakMap()) as T;
}

const SKIP_FUNCTION_KEYS = new Set(["length", "name", "caller", "arguments"]);

function deepClone(value: unknown, seen: WeakMap<object, unknown>): unknown {
  // Primitives
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return value;
  }

  const ref = value as object;

  // Circular reference guard
  if (seen.has(ref)) return seen.get(ref);

  // ── Function ──────────────────────────────────────────────────────────
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    const cloned = function (this: unknown, ...args: unknown[]) {
      return fn.apply(this, args);
    };
    seen.set(ref, cloned);

    Object.defineProperty(cloned, "name", { value: fn.name, configurable: true });

    // Deep-clone own data properties; skip built-ins; share prototype methods
    for (const key of Object.getOwnPropertyNames(fn)) {
      if (SKIP_FUNCTION_KEYS.has(key)) continue;
      if (key === "prototype") {
        // Rebuild prototype so constructor points at the clone, methods stay shared
        const proto = fn.prototype as object | undefined;
        if (proto) {
          const clonedProto = Object.create(Object.getPrototypeOf(proto));
          Object.defineProperty(clonedProto, "constructor", {
            value: cloned, writable: true, configurable: true,
          });
          for (const m of Object.getOwnPropertyNames(proto)) {
            if (m === "constructor") continue;
            Object.defineProperty(
              clonedProto, m,
              Object.getOwnPropertyDescriptor(proto, m)!,
            );
          }
          cloned.prototype = clonedProto;
        }
        continue;
      }
      const desc = Object.getOwnPropertyDescriptor(fn, key)!;
      Object.defineProperty(
        cloned, key,
        "value" in desc ? { ...desc, value: deepClone(desc.value, seen) } : desc,
      );
    }
    return cloned;
  }

  // ── Date ──────────────────────────────────────────────────────────────
  if (value instanceof Date) {
    const cloned = new Date(value.getTime());
    seen.set(ref, cloned);
    return cloned;
  }

  // ── RegExp ────────────────────────────────────────────────────────────
  if (value instanceof RegExp) {
    const cloned = new RegExp(value.source, value.flags);
    seen.set(ref, cloned);
    return cloned;
  }

  // ── Map ───────────────────────────────────────────────────────────────
  if (value instanceof Map) {
    const cloned = new Map<unknown, unknown>();
    seen.set(ref, cloned);
    for (const [k, v] of value) {
      cloned.set(deepClone(k, seen), deepClone(v, seen));
    }
    return cloned;
  }

  // ── Set ───────────────────────────────────────────────────────────────
  if (value instanceof Set) {
    const cloned = new Set<unknown>();
    seen.set(ref, cloned);
    for (const item of value) {
      cloned.add(deepClone(item, seen));
    }
    return cloned;
  }

  // ── ArrayBuffer ───────────────────────────────────────────────────────
  if (value instanceof ArrayBuffer) {
    const cloned = value.slice(0);
    seen.set(ref, cloned);
    return cloned;
  }

  // ── DataView ──────────────────────────────────────────────────────────
  if (value instanceof DataView) {
    const cloned = new DataView(
      value.buffer.slice(0),
      value.byteOffset,
      value.byteLength,
    );
    seen.set(ref, cloned);
    return cloned;
  }

  // ── TypedArrays (Uint8Array, Float32Array, …) ─────────────────────────
  if (ArrayBuffer.isView(value)) {
    const cloned = (value as unknown as { slice(): unknown }).slice();
    seen.set(ref, cloned as object);
    return cloned;
  }

  // ── Array ─────────────────────────────────────────────────────────────
  if (Array.isArray(value)) {
    const cloned: unknown[] = [];
    seen.set(ref, cloned);
    for (let i = 0; i < value.length; i++) {
      cloned[i] = deepClone(value[i], seen);
    }
    return cloned;
  }

  // ── Class instances and plain objects ─────────────────────────────────
  // Object.create(proto) preserves the prototype chain so instanceof works.
  const proto = Object.getPrototypeOf(value) as object | null;
  const cloned = Object.create(proto);
  seen.set(ref, cloned);

  for (const key of Object.getOwnPropertyNames(value)) {
    const desc = Object.getOwnPropertyDescriptor(value, key)!;
    Object.defineProperty(
      cloned, key,
      "value" in desc ? { ...desc, value: deepClone(desc.value, seen) } : desc,
    );
  }

  for (const sym of Object.getOwnPropertySymbols(value as object)) {
    const desc = Object.getOwnPropertyDescriptor(value, sym)!;
    Object.defineProperty(
      cloned, sym,
      "value" in desc ? { ...desc, value: deepClone(desc.value, seen) } : desc,
    );
  }

  return cloned;
}
