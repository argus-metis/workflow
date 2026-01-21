import { workflowPlugin } from '@workflow/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [workflowPlugin()],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
