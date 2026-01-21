import { workflow } from 'workflow/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [workflow()],
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 30000,
    globalSetup: './vitest.setup.ts',
    env: {
      WORKFLOW_LOCAL_BASE_URL: 'http://localhost:3000',
    },
  },
});
