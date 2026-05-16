/**
 * Routes — unit tests.
 * Verifies that the RouterBuilder is correctly configured with expected routes.
 * Uses getRoutes() directly — no HTTP server needed.
 *
 * The @lara-node/core mock overrides resolveMiddleware to accept any string
 * without throwing (no real middleware stack needed in unit tests).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lara-node/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lara-node/core')>();
  const noop = (_req: any, _res: any, next: any) => next?.();
  return {
    ...actual,
    resolveMiddleware: (mw: any) => {
      if (typeof mw === 'function') return mw;
      return noop;
    },
  };
});

import { routesBuilder } from '../../routes/api';
import { webRoutesBuilder } from '../../routes/web';

describe('API routes', () => {
  const routes = routesBuilder.getRoutes();

  it('registers a GET /health route', () => {
    const health = routes.find((r) => r.path === '/health' && r.method === 'GET');
    expect(health).toBeDefined();
  });

  it('registers POST /auth/register', () => {
    const route = routes.find((r) => r.path.includes('/auth/register') && r.method === 'POST');
    expect(route).toBeDefined();
  });

  it('registers POST /auth/login', () => {
    const route = routes.find((r) => r.path.includes('/auth/login') && r.method === 'POST');
    expect(route).toBeDefined();
  });

  it('registers GET /auth/me with auth middleware', () => {
    const route = routes.find((r) => r.path.includes('/auth/me') && r.method === 'GET');
    expect(route).toBeDefined();
    expect(route!.middleware).toContain('auth');
  });

  it('registers GET /users/ with can:view_users middleware', () => {
    const route = routes.find((r) => r.path.endsWith('/users/') && r.method === 'GET');
    expect(route).toBeDefined();
    // auth is applied at group level (not stored as a named string per-route)
    expect(route!.middleware).toContain('can:view_users');
  });

  it('registers DELETE /users/:id with auth + can:delete_users', () => {
    const route = routes.find((r) => r.path.includes('/users/') && r.path.includes(':id') && r.method === 'DELETE');
    expect(route).toBeDefined();
    expect(route!.middleware).toContain('can:delete_users');
  });

  it('has at least 7 API routes registered', () => {
    expect(routes.length).toBeGreaterThanOrEqual(7);
  });
});

describe('Web routes', () => {
  const routes = webRoutesBuilder.getRoutes();

  it('registers a GET / route', () => {
    const home = routes.find((r) => r.path === '/' && r.method === 'GET');
    expect(home).toBeDefined();
  });
});
