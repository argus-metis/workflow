import { FatalError } from 'workflow';

/**
 * Input validation parameters
 */
type ValidateInputParams = {
  /** Data to validate */
  data: any;
  /** Validation schema */
  schema: any;
};

/**
 * Validate input data against schemas with detailed error messages.
 *
 * @param params - Validation parameters
 * @returns Validated data
 */
export async function validateInput(params: ValidateInputParams) {
  'use step';

  // TODO: Implement input validation (e.g., with Zod)
  throw new FatalError('Not implemented');
}
