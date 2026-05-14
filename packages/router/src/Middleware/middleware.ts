import { NextFunction, RequestHandler } from "express";
import { middlewareStack, MiddlewareStack } from "./MiddlewareStack.js";
import type { Middleware, IMiddleware, MiddlewareGroupConfig } from "./MiddlewareStack.js";

export type MiddlewareEntry = RequestHandler | ((...args: any[]) => RequestHandler);

const registry: Record<string, MiddlewareEntry> = {};

export function registerMiddleware(name: string, entry: MiddlewareEntry) {
  registry[name] = entry;
  // Also register with the new stack system
  middlewareStack.alias(name, entry);
}

export function getRegisteredMiddleware(): Record<string, MiddlewareEntry> {
  return { ...registry };
}

export function hasMiddleware(name: string): boolean {
  return name in registry || middlewareStack.hasAlias(name) || middlewareStack.hasGroup(name);
}

/**
 * Get the middleware stack instance.
 */
export function getMiddlewareStack(): MiddlewareStack {
  return middlewareStack;
}

export function resolveMiddleware(
  mw: string | RequestHandler | (RequestHandler | string)[],
): RequestHandler | RequestHandler[] {
  if (typeof mw === "function") return mw;
  if (Array.isArray(mw)) return mw.map((m) => resolveMiddleware(m) as RequestHandler);

  // string -> maybe 'auth' or 'can:view_users' or 'role:admin' or a group like 'web'
  const [key, rest] = (mw as string).split(":");

  // Try the new MiddlewareStack first for groups
  if (middlewareStack.hasGroup(key) && rest === undefined) {
    return middlewareStack.getResolvedGroup(key);
  }

  // Try the new MiddlewareStack for aliases
  if (middlewareStack.hasAlias(key)) {
    const args = rest ? rest.split(",").map((s) => s.trim()) : [];
    return middlewareStack.resolve(middlewareStack.getAlias(key)!, args) as
      | RequestHandler
      | RequestHandler[];
  }

  // Fall back to legacy registry
  if (rest !== undefined && rest.split(",").length > 0) {
    const args = rest ? rest.split(",").map((s) => s.trim()) : [];
    const factory = registry[key] as any;
    if (!factory) {
      // Attempt to lazily load HTTP kernel middleware
      try {
      } catch (e) {
        // ignore
      }
      const retryFactory = registry[key] as any;
      if (!retryFactory) throw new Error(`Unknown middleware factory: ${key}`);
      return retryFactory(...args);
    }
    return factory(...args);
  }

  const found = registry[mw as string];
  if (found) return found as RequestHandler;

  // Try to require HTTP middleware module and retry
  try {
  } catch (e) {
    // ignore
  }
  const found2 = registry[mw as string];
  if (found2) return found2 as RequestHandler;

  throw new Error(`Unknown middleware: ${String(mw)}`);
}
// Re-export from MiddlewareStack
export { MiddlewareStack, Middleware, IMiddleware, MiddlewareGroupConfig, middlewareStack };
