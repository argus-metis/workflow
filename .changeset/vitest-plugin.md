---
"@workflow/vitest": patch
---

Add new `@workflow/vitest` package for running unit tests on workflow code

The new Vitest plugin enables testing files containing `"use workflow"` and `"use step"` directives by applying the necessary SWC transformations during the test compilation phase.

Example usage:
```ts
// vitest.config.ts
import { workflowPlugin } from '@workflow/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [workflowPlugin()],
});
```
