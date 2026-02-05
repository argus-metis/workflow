import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRateLimitError, withRetry } from './retry.js';

describe('isRateLimitError', () => {
  it('returns true for errors with status 429', () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
  });

  it('returns false for errors with other status codes', () => {
    expect(isRateLimitError({ status: 500 })).toBe(false);
    expect(isRateLimitError({ status: 404 })).toBe(false);
    expect(isRateLimitError({ status: 200 })).toBe(false);
  });

  it('returns false for errors without status', () => {
    expect(isRateLimitError(new Error('test'))).toBe(false);
    expect(isRateLimitError({})).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first successful call', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 error and succeeds on retry', async () => {
    const error429 = { status: 429, message: 'Too Many Requests' };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce('success');

    const resultPromise = withRetry(fn, { baseDelay: 100 });

    // Advance past the first retry delay
    await vi.advanceTimersByTimeAsync(150);

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries multiple times with exponential backoff', async () => {
    const error429 = { status: 429 };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce('success');

    const resultPromise = withRetry(fn, { baseDelay: 100, maxRetries: 3 });

    // First retry after ~100ms
    await vi.advanceTimersByTimeAsync(150);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry after ~200ms (exponential backoff)
    await vi.advanceTimersByTimeAsync(250);
    expect(fn).toHaveBeenCalledTimes(3);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('throws after exhausting all retries', async () => {
    const error429 = { status: 429, message: 'Rate limited' };
    const fn = vi.fn().mockRejectedValue(error429);

    // Use try/catch pattern to avoid unhandled rejection warnings with fake timers
    let caughtError: unknown;
    const resultPromise = withRetry(fn, {
      baseDelay: 100,
      maxRetries: 2,
    }).catch((e) => {
      caughtError = e;
    });

    // Run all timers to completion
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(caughtError).toEqual(error429);
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('does not retry non-429 errors', async () => {
    const error500 = { status: 500, message: 'Server Error' };
    const fn = vi.fn().mockRejectedValue(error500);

    await expect(withRetry(fn)).rejects.toEqual(error500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses custom shouldRetry function', async () => {
    const error503 = { status: 503, message: 'Service Unavailable' };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error503)
      .mockResolvedValueOnce('success');

    const resultPromise = withRetry(fn, {
      baseDelay: 100,
      shouldRetry: (error) => (error as { status?: number })?.status === 503,
    });

    await vi.advanceTimersByTimeAsync(150);

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses Retry-After when provided by getRetryAfter', async () => {
    const error429 = { status: 429, retryAfter: 500 };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce('success');

    const resultPromise = withRetry(fn, {
      baseDelay: 100, // Would normally use 100ms
      getRetryAfter: (error) => (error as { retryAfter?: number })?.retryAfter,
    });

    // Should use retryAfter value (500ms) instead of baseDelay (100ms)
    await vi.advanceTimersByTimeAsync(300);
    expect(fn).toHaveBeenCalledTimes(1); // Not yet retried

    await vi.advanceTimersByTimeAsync(300);
    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('calls onRetry callback before each retry', async () => {
    const error429 = { status: 429 };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce('success');

    const onRetry = vi.fn();

    const resultPromise = withRetry(fn, {
      baseDelay: 100,
      onRetry,
    });

    await vi.advanceTimersByTimeAsync(500);

    await resultPromise;
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Number), error429);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Number), error429);
  });

  it('respects maxDelay cap', async () => {
    const error429 = { status: 429 };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce('success');

    const onRetry = vi.fn();

    const resultPromise = withRetry(fn, {
      baseDelay: 1000,
      maxDelay: 1500,
      maxRetries: 4,
      onRetry,
    });

    // Run all timers to completion
    await vi.runAllTimersAsync();

    await resultPromise;

    // Verify delays are capped at maxDelay
    for (const call of onRetry.mock.calls) {
      expect(call[1]).toBeLessThanOrEqual(1500 * 1.25); // maxDelay + jitter
    }
  });

  it('defaults to 3 max retries', async () => {
    const error429 = { status: 429 };
    const fn = vi.fn().mockRejectedValue(error429);

    // Use try/catch pattern to avoid unhandled rejection warnings with fake timers
    let caughtError: unknown;
    const resultPromise = withRetry(fn, { baseDelay: 10 }).catch((e) => {
      caughtError = e;
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    expect(caughtError).toEqual(error429);
    expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });
});
