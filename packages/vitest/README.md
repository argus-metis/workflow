# @workflow/vitest

Vitest plugin for [Workflow DevKit](https://useworkflow.dev).

This plugin enables running unit tests that cover files containing `"use workflow"` and `"use step"` directives by applying the necessary SWC transformations.

## Installation

```bash
npm install @workflow/vitest --save-dev
# or
pnpm add -D @workflow/vitest
# or
yarn add -D @workflow/vitest
```

## Usage

Add the plugin to your Vitest configuration:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { workflowPlugin } from '@workflow/vitest';

export default defineConfig({
  plugins: [workflowPlugin()],
  test: {
    // your test configuration
  },
});
```

## How It Works

The plugin applies the Workflow SWC transformation to files containing `"use workflow"` or `"use step"` directives during the test compilation phase. This transforms workflow and step functions into their client-side representations, allowing you to:

- Import and test modules that contain workflow/step directives
- Write unit tests for code that interacts with workflow functions
- Test the client-side behavior of your workflow integrations

## Example

```ts
// workflows/my-workflow.ts
'use workflow';

export async function myWorkflow(input: string) {
  const result = await processData(input);
  return result;
}

// workflows/my-workflow.test.ts
import { describe, it, expect } from 'vitest';
import { myWorkflow } from './my-workflow';

describe('myWorkflow', () => {
  it('should be defined', () => {
    expect(myWorkflow).toBeDefined();
  });
});
```

## License

Apache-2.0
