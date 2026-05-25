import { asyncLocalStorage } from "@lara-node/middlewares";
import { verifyToken } from "./auth.js";

// ---------------------------------------------------------------------------
// AuthGuard — the object returned by auth()
// ---------------------------------------------------------------------------

export interface AuthGuard<U = Record<string, unknown>> {
  /** Resolved user model/object, or null when unauthenticated. */
  user(): U | null;

  /** Primary-key value of the current user, or undefined. */
  id(): string | number | undefined;

  /** True when a user is authenticated. */
  check(): boolean;

  /** True when no user is authenticated. */
  guest(): boolean;

  /** Raw Bearer token from the current request, or null. */
  token(): string | null;

  /**
   * True when the current token's payload contains the given ability/scope.
   * The wildcard `"*"` grants all abilities.
   */
  tokenCan(ability: string): boolean;

  /**
   * True when the current user has ALL of the given roles.
   * Reads `user.roles` — an array of role slug strings.
   */
  hasRole(...roles: string[]): boolean;

  /**
   * True when the current user has ALL of the given permissions.
   * Reads `user.permissions` — an array of permission slug strings.
   */
  hasPermission(...permissions: string[]): boolean;

  /**
   * True when the current user has any one of the given permissions.
   */
  hasAnyPermission(...permissions: string[]): boolean;

  /**
   * True when the current user has any one of the given roles.
   */
  hasAnyRole(...roles: string[]): boolean;

  /**
   * Set (login) a user into the current async context.
   * Call this after loading the user model to make it available
   * to all downstream code in the same request.
   */
  login(user: U): void;

  /** Remove the current user from the async context (logout). */
  logout(): void;
}

// ---------------------------------------------------------------------------
// auth() — primary entry point
// ---------------------------------------------------------------------------

export function auth<U = Record<string, unknown>>(): AuthGuard<U> {
  const store = asyncLocalStorage.getStore();
  const user = store?.user as U | undefined;
  const req = store?.req as Record<string, unknown> | undefined;

  return {
    user(): U | null {
      return user ?? null;
    },

    id(): string | number | undefined {
      if (!user) return undefined;
      const u = user as Record<string, unknown> & {
        getAttribute?: (k: string) => unknown;
        constructor?: { primaryKey?: string };
      };
      if (typeof u.getAttribute === "function") {
        const pk = u.constructor?.primaryKey ?? "id";
        return u.getAttribute(pk) as string | number | undefined;
      }
      return (u.id ?? (u as Record<string, unknown>)._id) as string | number | undefined;
    },

    check(): boolean {
      return !!user;
    },

    guest(): boolean {
      return !user;
    },

    token(): string | null {
      if (!req) return null;
      const headers = req.headers as Record<string, string> | undefined;
      const header = headers?.authorization ?? "";
      if (header.startsWith("Bearer ")) return header.slice(7);
      return null;
    },

    tokenCan(ability: string): boolean {
      const tk = this.token();
      if (!tk) return false;
      const payload = verifyToken(tk);
      if (!payload) return false;
      const abilities: string[] =
        (payload as Record<string, unknown>).abilities as string[] ??
        (payload as Record<string, unknown>).scopes as string[] ??
        [];
      return abilities.includes("*") || abilities.includes(ability);
    },

    hasRole(...roles: string[]): boolean {
      if (!user) return false;
      const userRoles: string[] = ((user as Record<string, unknown>).roles as string[]) ?? [];
      return roles.every((r) => userRoles.includes(r));
    },

    hasAnyRole(...roles: string[]): boolean {
      if (!user) return false;
      const userRoles: string[] = ((user as Record<string, unknown>).roles as string[]) ?? [];
      return roles.some((r) => userRoles.includes(r));
    },

    hasPermission(...permissions: string[]): boolean {
      if (!user) return false;
      const userPerms: string[] =
        ((user as Record<string, unknown>).permissions as string[]) ?? [];
      return permissions.every((p) => userPerms.includes(p));
    },

    hasAnyPermission(...permissions: string[]): boolean {
      if (!user) return false;
      const userPerms: string[] =
        ((user as Record<string, unknown>).permissions as string[]) ?? [];
      return permissions.some((p) => userPerms.includes(p));
    },

    login(u: U): void {
      if (store) store.user = u;
    },

    logout(): void {
      if (store) delete store.user;
    },
  };
}

// ---------------------------------------------------------------------------
// Standalone helpers (also available on auth())
// ---------------------------------------------------------------------------

/** Set the authenticated user for the current async context. */
export function setUser<U = unknown>(user: U): void {
  const store = asyncLocalStorage.getStore();
  if (store) store.user = user;
}

/** Remove the authenticated user from the current async context. */
export function clearUser(): void {
  const store = asyncLocalStorage.getStore();
  if (store) delete store.user;
}

/** Get the raw user value from the current async context without wrapping. */
export function getUser<U = unknown>(): U | undefined {
  return asyncLocalStorage.getStore()?.user as U | undefined;
}

// ---------------------------------------------------------------------------
// Global type augmentation
// ---------------------------------------------------------------------------

declare global {
  /** Returns the auth guard for the current request context. */
  function auth<U = Record<string, unknown>>(): AuthGuard<U>;

  /** Set the authenticated user for the current request context. */
  function setUser<U = unknown>(user: U): void;

  /** Remove the authenticated user from the current request context. */
  function clearUser(): void;

  /** Get the raw user value from the current request context. */
  function getUser<U = unknown>(): U | undefined;
}
