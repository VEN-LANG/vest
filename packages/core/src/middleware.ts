import { RequestHandler } from "express";
import { middlewareStack, MiddlewareStack } from "./MiddlewareStack.js";
import type { Middleware, IMiddleware, MiddlewareGroupConfig, MiddlewareEntry } from "./MiddlewareStack.js";

// globalThis singleton — survives multiple versions of this module in the same process
const _REGISTRY_KEY = "__lara_node_middleware_registry__";
if (!(globalThis as Record<string, unknown>)[_REGISTRY_KEY]) {
  (globalThis as Record<string, unknown>)[_REGISTRY_KEY] = {};
}
const registry: Record<string, MiddlewareEntry> = (
  globalThis as Record<string, unknown>
)[_REGISTRY_KEY] as Record<string, MiddlewareEntry>;

export function registerMiddleware(name: string, entry: MiddlewareEntry | Middleware): void {
  registry[name] = entry as MiddlewareEntry;
  middlewareStack.alias(name, entry as MiddlewareEntry);
}

export function getRegisteredMiddleware(): Record<string, MiddlewareEntry> {
  return { ...registry };
}

export function hasMiddleware(name: string): boolean {
  return name in registry || middlewareStack.hasAlias(name) || middlewareStack.hasGroup(name);
}

export function getMiddlewareStack(): MiddlewareStack {
  return middlewareStack;
}

export function resolveMiddleware(
  mw: string | RequestHandler | (RequestHandler | string)[],
): RequestHandler | RequestHandler[] {
  if (typeof mw === "function") return mw;
  if (Array.isArray(mw)) return mw.map((m) => resolveMiddleware(m) as RequestHandler);

  const [key, rest] = (mw as string).split(":");

  if (middlewareStack.hasGroup(key) && rest === undefined) {
    return middlewareStack.getResolvedGroup(key);
  }

  if (middlewareStack.hasAlias(key)) {
    const args = rest ? rest.split(",").map((s) => s.trim()) : [];
    return middlewareStack.resolve(middlewareStack.getAlias(key)!, args) as
      | RequestHandler
      | RequestHandler[];
  }

  if (rest !== undefined) {
    const args = rest ? rest.split(",").map((s) => s.trim()) : [];
    const factory = registry[key] as ((...a: string[]) => RequestHandler) | undefined;
    if (!factory) throw new Error(`Unknown middleware factory: ${key}`);
    return factory(...args);
  }

  const found = registry[mw as string];
  if (found) return found as RequestHandler;

  throw new Error(`Unknown middleware: ${String(mw)}`);
}

export { MiddlewareStack, Middleware, IMiddleware, MiddlewareGroupConfig, middlewareStack, MiddlewareEntry };
