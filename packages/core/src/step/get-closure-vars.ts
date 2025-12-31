import { NotInStepContextError } from '../not-in-workflow-context-error.js';
import { contextStorage } from './context-storage.js';

/**
 * Returns the closure variables for the current step function.
 * This is an internal function used by the SWC transform to access
 * variables from the parent workflow scope.
 *
 * @internal
 */
export function __private_getClosureVars(): Record<string, any> {
  const ctx = contextStorage.getStore();
  if (!ctx) {
    throw new NotInStepContextError(
      '[Closure variables]',
      'Step functions: https://useworkflow.dev/docs/foundations/workflows-and-steps#step-functions'
    );
  }
  return ctx.closureVars || {};
}
