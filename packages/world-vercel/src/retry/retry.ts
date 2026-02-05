/** Default maximum number of retry attempts */
export const DEFAULT_MAX_RETRIES = 3;

/** Default base delay in milliseconds for exponential backoff */
export const DEFAULT_BASE_DELAY = 1000;

/** Default maximum delay in milliseconds (cap for exponential backoff) */
export const DEFAULT_MAX_DELAY = 10000;

/**
 * Options for the withRetry utility.
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (not including the initial attempt).
   * @default DEFAULT_MAX_RETRIES
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds for exponential backoff.
   * Actual delays will be: baseDelay, baseDelay*2, baseDelay*4, etc.
   * @default DEFAULT_BASE_DELAY
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds (cap for exponential backoff).
   * @default DEFAULT_MAX_DELAY
   */
  maxDelay?: number;

  /**
   * Function to determine if an error should trigger a retry.
   * By default, retries on errors with status 429.
   */
  shouldRetry?: (error: unknown) => boolean;

  /**
   * Function to extract Retry-After delay from an error (in milliseconds).
   * If provided and returns a number, that delay will be used instead of exponential backoff.
   */
  getRetryAfter?: (error: unknown) => number | undefined;

  /**
   * Optional callback invoked before each retry attempt.
   * Useful for logging or telemetry.
   */
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

/**
 * Default function to check if an error is a 429 (Too Many Requests) error.
 * Works with errors that have a `status` property (like WorkflowAPIError).
 */
export function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status?: number }).status === 429;
  }
  return false;
}

/**
 * Sleep for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with optional jitter.
 */
function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Exponential: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * 2 ** attempt;
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Wraps an async function with automatic retry logic for rate limit (429) errors.
 *
 * Uses exponential backoff with jitter, and respects Retry-After headers when available.
 * This utility is designed to be used by any world implementation that makes HTTP calls.
 *
 * @example
 * ```ts
 * // Basic usage - retries on 429 errors
 * const result = await withRetry(() => makeApiCall());
 *
 * // With custom options
 * const result = await withRetry(
 *   () => makeApiCall(),
 *   {
 *     maxRetries: 5,
 *     baseDelay: 200,
 *     onRetry: (attempt, delay) => console.log(`Retry ${attempt} after ${delay}ms`)
 *   }
 * );
 *
 * // With custom retry condition
 * const result = await withRetry(
 *   () => makeApiCall(),
 *   {
 *     shouldRetry: (error) => {
 *       const status = (error as any)?.status;
 *       return status === 429 || status === 503;
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelay = DEFAULT_BASE_DELAY,
    maxDelay = DEFAULT_MAX_DELAY,
    shouldRetry = isRateLimitError,
    getRetryAfter,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or error isn't retryable
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay: use Retry-After if available, otherwise exponential backoff
      let delay: number;
      const retryAfter = getRetryAfter?.(error);
      if (typeof retryAfter === 'number' && retryAfter > 0) {
        delay = Math.min(retryAfter, maxDelay);
      } else {
        delay = calculateBackoff(attempt, baseDelay, maxDelay);
      }

      // Notify before retry
      onRetry?.(attempt + 1, delay, error);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached due to the throw in the loop,
  // but TypeScript needs it for type safety
  throw lastError;
}
