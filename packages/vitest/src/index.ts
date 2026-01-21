import { workflowTransformPlugin } from '@workflow/rollup';
import type { Plugin } from 'vitest/config';

/**
 * Vitest plugin for Workflow DevKit.
 *
 * This plugin enables running unit tests that cover files containing
 * `"use workflow"` and `"use step"` directives. It applies the necessary
 * SWC transformations to convert workflow and step functions into their
 * client-side representations.
 *
 * @example
 * ```ts
 * // vitest.config.ts
 * import { defineConfig } from 'vitest/config';
 * import { workflowPlugin } from '@workflow/vitest';
 *
 * export default defineConfig({
 *   plugins: [workflowPlugin()],
 *   test: {
 *     // your test configuration
 *   },
 * });
 * ```
 */
export function workflowPlugin(): Plugin {
  return workflowTransformPlugin() as Plugin;
}

export { workflowTransformPlugin };
