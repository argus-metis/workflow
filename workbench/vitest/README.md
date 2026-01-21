# @workflow/vitest-workbench

This workbench demonstrates how to use `@workflow/vitest` plugin to run unit tests on code containing `"use workflow"` and `"use step"` directives.

## Overview

The `@workflow/vitest` plugin applies the necessary SWC transformations to files containing workflow directives, allowing you to import and test them in your Vitest test suite.

## Usage

1. Install the plugin:

```bash
pnpm add -D @workflow/vitest
```

2. Configure Vitest (`vitest.config.ts`):

```ts
import { workflowPlugin } from '@workflow/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [workflowPlugin()],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
```

3. Write tests that import workflow files:

```ts
import { describe, expect, it } from 'vitest';
import { myWorkflow } from '../workflows/my-workflow.js';

describe('myWorkflow', () => {
  it('should be defined', () => {
    expect(myWorkflow).toBeDefined();
  });
});
```

## Running Tests

```bash
pnpm test
```

## License

Apache-2.0
