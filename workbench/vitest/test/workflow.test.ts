import { describe, expect, it } from 'vitest';
import { add, calculateWorkflow, multiply } from '../workflows/simple.js';

describe('workflow plugin transformation', () => {
  describe('step functions', () => {
    it('add() should compute the sum of two numbers', async () => {
      const result = await add(3, 5);
      expect(result).toBe(8);
    });

    it('add() should handle negative numbers', async () => {
      const result = await add(-10, 5);
      expect(result).toBe(-5);
    });

    it('multiply() should compute the product of two numbers', async () => {
      const result = await multiply(4, 7);
      expect(result).toBe(28);
    });

    it('multiply() should handle zero', async () => {
      const result = await multiply(100, 0);
      expect(result).toBe(0);
    });
  });

  describe('workflow functions', () => {
    it('calculateWorkflow should have workflowId property attached', () => {
      expect(calculateWorkflow).toHaveProperty('workflowId');
      expect(
        typeof (calculateWorkflow as { workflowId?: string }).workflowId
      ).toBe('string');
    });

    it('calculateWorkflow should throw when called directly', async () => {
      await expect(calculateWorkflow(3, 5)).rejects.toThrow(
        /You attempted to execute workflow calculateWorkflow/
      );
    });
  });
});
