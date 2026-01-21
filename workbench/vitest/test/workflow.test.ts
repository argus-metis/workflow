import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { start } from 'workflow/api';
import { hydrateWorkflowReturnValue } from 'workflow/internal/serialization';
import { calculateWorkflow } from '../workflows/simple.js';
import { type TestServer, startTestServer } from '../src/server.js';

describe('workflow with start()', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  }, 30000);

  afterAll(async () => {
    await server?.close();
  });

  it('should run calculateWorkflow and return correct result', async () => {
    // Start the workflow
    const { runId } = await server.invoke(calculateWorkflow, [2, 7]);
    expect(runId).toMatch(/^wrun_/);

    // Wait for completion
    const result = await server.waitForCompletion(runId);
    expect(result.status).toBe('completed');

    // Hydrate and verify the output
    const output = await hydrateWorkflowReturnValue(result.output, [], runId);

    // calculateWorkflow(2, 7) should return:
    // sum: 2 + 7 = 9
    // product: 2 * 7 = 14
    // combined: 9 + 14 = 23
    expect(output).toEqual({
      sum: 9,
      product: 14,
      combined: 23,
    });
  }, 15000);

  it('should handle different input values', async () => {
    const { runId } = await server.invoke(calculateWorkflow, [5, 3]);
    const result = await server.waitForCompletion(runId);
    expect(result.status).toBe('completed');

    const output = await hydrateWorkflowReturnValue(result.output, [], runId);

    // calculateWorkflow(5, 3) should return:
    // sum: 5 + 3 = 8
    // product: 5 * 3 = 15
    // combined: 8 + 15 = 23
    expect(output).toEqual({
      sum: 8,
      product: 15,
      combined: 23,
    });
  }, 15000);
});
