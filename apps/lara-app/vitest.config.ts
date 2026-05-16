import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 15_000,
    include: ['src/__tests__/**/*.test.ts'],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@database': path.resolve(__dirname, 'src/database'),
      '@routes': path.resolve(__dirname, 'src/routes'),
    },
  },
});
