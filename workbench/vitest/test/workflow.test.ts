import { describe, expect, it } from 'vitest';
import { calculateWorkflow, greetWorkflow } from '../workflows/simple.js';

describe('workflow plugin', () => {
  describe('calculateWorkflow', () => {
    it('should be defined after transformation', () => {
      expect(calculateWorkflow).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof calculateWorkflow).toBe('function');
    });
  });

  describe('greetWorkflow', () => {
    it('should be defined after transformation', () => {
      expect(greetWorkflow).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof greetWorkflow).toBe('function');
    });
  });
});
