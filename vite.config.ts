import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Lara-Node — Vite+ Unified Toolchain Configuration
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
      '@lara-node/core': resolve(__dirname, 'packages/core/src'),
      '@lara-node/cache': resolve(__dirname, 'packages/cache/src'),
      '@lara-node/db': resolve(__dirname, 'packages/db/src'),
      '@lara-node/events': resolve(__dirname, 'packages/events/src'),
      '@lara-node/queue': resolve(__dirname, 'packages/queue/src'),
      '@lara-node/mail': resolve(__dirname, 'packages/mail/src'),
      '@lara-node/router': resolve(__dirname, 'packages/router/src'),
      '@lara-node/auth': resolve(__dirname, 'packages/auth/src'),
      '@lara-node/console': resolve(__dirname, 'packages/console/src'),
      '@lara-node/horizon': resolve(__dirname, 'packages/horizon/src'),
      '@lara-node/telescope': resolve(__dirname, 'packages/telescope/src'),
      '@lara-node/middlewares': resolve(__dirname, 'packages/middlewares/src'),
      '@lara-node/validator': resolve(__dirname, 'packages/validator/src'),
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
