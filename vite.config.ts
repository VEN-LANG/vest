import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Vest — Vite+ Unified Toolchain Configuration
 *
 * Tools configured here:
 *   - Vitest      — testing (vitest run / vitest watch)
 *   - Oxlint      — linting  (oxlint packages apps)
 *   - Oxfmt       — formatting (oxfmt packages apps)
 *   - tsc         — type checking (tsc -b)
 *   - tsdown      — building per-package (see packages/*\/package.json)
 */
export default defineConfig({
  // ---------------------------------------------------------------------------
  // Path aliases — resolved when running tests across the monorepo.
  // Individual packages use NodeNext module resolution for production builds.
  // ---------------------------------------------------------------------------
  resolve: {
    alias: {
      '@vest/core': resolve(__dirname, 'packages/core/src'),
      '@vest/cache': resolve(__dirname, 'packages/cache/src'),
      '@vest/db': resolve(__dirname, 'packages/db/src'),
      '@vest/events': resolve(__dirname, 'packages/events/src'),
      '@vest/queue': resolve(__dirname, 'packages/queue/src'),
      '@vest/mail': resolve(__dirname, 'packages/mail/src'),
      '@vest/router': resolve(__dirname, 'packages/router/src'),
      '@vest/auth': resolve(__dirname, 'packages/auth/src'),
      '@vest/console': resolve(__dirname, 'packages/console/src'),
      '@vest/horizon': resolve(__dirname, 'packages/horizon/src'),
      '@vest/telescope': resolve(__dirname, 'packages/telescope/src'),
    },
  },

  // ---------------------------------------------------------------------------
  // Vitest — test runner
  // ---------------------------------------------------------------------------
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/*/src/**/*.{test,spec}.ts',
      'apps/*/src/**/*.{test,spec}.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.{test,spec}.ts', '**/index.ts'],
    },
    reporters: ['verbose'],
  },
});
