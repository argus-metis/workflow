import { describe, expect, it } from 'vitest';
import { start } from 'workflow/api';
import { calculateWorkflow } from '../workflows/simple.js';

describe('workflow with start()', () => {
  it('should run calculateWorkflow and return correct result', async () => {
    const run = await start(calculateWorkflow, [2, 7]);

    expect(run).toBeDefined();
    expect(run.runId).toMatch(/^wrun_/);

    const result = await run.returnValue;

    // calculateWorkflow(2, 7) should return:
    // sum: 2 + 7 = 9
    // product: 2 * 7 = 14
    // combined: 9 + 14 = 23
    expect(result).toEqual({
      sum: 9,
      product: 14,
      combined: 23,
    });
  });
});
