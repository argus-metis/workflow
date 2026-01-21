# @workflow/vitest-workbench

This workbench demonstrates how to test workflows with Vitest using `start()`.

## How It Works

1. **Nitro Server**: A Nitro dev server is started via `globalSetup` before tests run
2. **Vite Plugin**: Uses `workflow/vite` plugin to transform workflow imports
3. **Tests**: Use `start(workflow, args)` and await `run.returnValue`

## Usage

```bash
pnpm test
```

## Example Test

```ts
import { describe, expect, it } from 'vitest';
import { start } from 'workflow/api';
import { calculateWorkflow } from '../workflows/simple.js';

describe('workflow with start()', () => {
  it('should run calculateWorkflow', async () => {
    const run = await start(calculateWorkflow, [2, 7]);

    expect(run.runId).toMatch(/^wrun_/);

    const result = await run.returnValue;

    expect(result).toEqual({
      sum: 9,
      product: 14,
      combined: 23,
    });
  });
});
```

## Project Structure

```
workbench/vitest/
├── workflows/
│   └── simple.ts        # Example workflow with steps
├── test/
│   └── workflow.test.ts # Tests using start()
├── nitro.config.ts      # Nitro config with workflow module
├── vitest.config.ts     # Vitest config with workflow plugin
└── vitest.setup.ts      # Global setup to start Nitro server
```
