import { FatalError } from 'workflow';

/**
 * Fetch data parameters
 */
type FetchDataParams = {
  /** URL to fetch */
  url: string;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: any;
  /** Timeout in milliseconds */
  timeout?: number;
};

/**
 * Make HTTP requests with automatic retries and timeout handling.
 *
 * @param params - Fetch parameters
 * @returns Response data
 */
export async function fetchData(params: FetchDataParams) {
  'use step';

  // TODO: Implement HTTP request with retries
  throw new FatalError('Not implemented');
}
