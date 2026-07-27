import { AsyncLocalStorage } from "async_hooks";
import type { Request as ExpressRequest } from "express";

/*
|--------------------------------------------------------------------------
| Request Context
|--------------------------------------------------------------------------
|
| A per-request store propagated through the async call graph, so any code
| running during a request can reach the request without it being threaded
| through every function signature — the same role Laravel's request()
| helper plays.
|
| The store is populated by AsyncContextMiddleware (@lara-node/middlewares)
| and read by request() (here) and auth() (@lara-node/auth).
|
*/

export interface RequestContextStore extends Record<string, unknown> {
  req?: ExpressRequest;
  user?: unknown;
}

// globalThis singleton — two copies of this module in one process (a
// hoisted dep plus a nested one) must still share a single store, otherwise
// request() silently returns null inside packages resolving the other copy.
const _ALS_KEY = "__lara_node_async_local_storage__";
if (!(globalThis as Record<string, unknown>)[_ALS_KEY]) {
  (globalThis as Record<string, unknown>)[_ALS_KEY] = new AsyncLocalStorage<RequestContextStore>();
}

export const asyncLocalStorage: AsyncLocalStorage<RequestContextStore> = (
  globalThis as Record<string, unknown>
)[_ALS_KEY] as AsyncLocalStorage<RequestContextStore>;

/** Run `fn` with a fresh request-scoped store. */
export function runWithContext<T>(store: RequestContextStore, fn: () => T): T {
  return asyncLocalStorage.run(store, fn);
}

/** The current request-scoped store, or undefined outside a request. */
export function currentContext(): RequestContextStore | undefined {
  return asyncLocalStorage.getStore();
}

/** Read one value from the current request-scoped store. */
export function contextGet<T = unknown>(key: string): T | undefined {
  return asyncLocalStorage.getStore()?.[key] as T | undefined;
}

/**
 * Write one value into the current request-scoped store.
 * No-op outside a request context.
 */
export function contextSet(key: string, value: unknown): void {
  const store = asyncLocalStorage.getStore();
  if (store) store[key] = value;
}
