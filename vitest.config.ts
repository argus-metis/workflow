import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    // Exclude web-e2e package - it uses Playwright, not vitest
    exclude: ['**/node_modules/**', '**/dist/**', 'packages/web-e2e/**'],
  },
  benchmark: {
    include: ['**/*.bench.ts'],
  },
});
