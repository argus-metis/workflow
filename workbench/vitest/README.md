# @workflow/vitest-workbench

This workbench demonstrates how to test workflows with Vitest using `start()` and proper workflow execution.

## Overview

The tests in this workbench show how to:

1. Build workflow bundles using the `workflow` CLI
2. Start a test server that can execute workflows
3. Use `start()` to invoke workflows and verify results

## How It Works

1. **Build Phase**: `wf build` compiles workflows into executable bundles in `.well-known/workflow/v1/`
2. **Test Server**: A minimal Hono server loads these bundles and provides the workflow runtime
3. **Tests**: Use `start(workflow, args)` to invoke workflows and assert on the return values

## Usage

```bash
# Run tests (includes build step)
pnpm test
```

## Example Test

```ts
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { calculateWorkflow } from '../workflows/simple.js';
import { startTestServer, type TestServer } from '../src/server.js';

describe('workflow with start()', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server?.close();
  });

  it('should run calculateWorkflow', async () => {
    const { runId } = await server.invoke(calculateWorkflow, [2, 7]);
    const result = await server.waitForCompletion(runId);
    
    expect(result.status).toBe('completed');
    expect(result.output).toEqual({
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
├── workflows/          # Workflow source files
│   └── simple.ts       # Example workflow with steps
├── src/
│   └── server.ts       # Test server setup
├── test/
│   └── workflow.test.ts # Tests using start()
├── vitest.config.ts    # Vitest config with workflow plugin
└── package.json
```

## License

Apache-2.0
