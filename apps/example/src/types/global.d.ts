import type { AuthGuard } from '@lara-node/auth';

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

export {};
