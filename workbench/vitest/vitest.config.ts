import { workflowTransformPlugin } from '@workflow/rollup';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [workflowTransformPlugin()],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
