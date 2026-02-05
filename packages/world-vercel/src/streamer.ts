import { isRateLimitError, withRetry } from '@workflow/utils';
import type { Streamer } from '@workflow/world';
import { type APIConfig, getHttpConfig, type HttpConfig } from './utils.js';

function getStreamUrl(
  name: string,
  runId: string | undefined,
  httpConfig: HttpConfig
) {
  if (runId) {
    return new URL(
      `${httpConfig.baseUrl}/v2/runs/${runId}/stream/${encodeURIComponent(name)}`
    );
  }
  return new URL(`${httpConfig.baseUrl}/v2/stream/${encodeURIComponent(name)}`);
}

/**
 * Encode multiple chunks into a length-prefixed binary format.
 * Format: [4 bytes big-endian length][chunk bytes][4 bytes length][chunk bytes]...
 *
 * This preserves chunk boundaries so the server can store them as separate
 * chunks, maintaining correct startIndex semantics for readers.
 *
 * @internal Exported for testing purposes
 */
export function encodeMultiChunks(chunks: (string | Uint8Array)[]): Uint8Array {
  const encoder = new TextEncoder();

  // Convert all chunks to Uint8Array and calculate total size
  const binaryChunks: Uint8Array[] = [];
  let totalSize = 0;

  for (const chunk of chunks) {
    const binary = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    binaryChunks.push(binary);
    totalSize += 4 + binary.length; // 4 bytes for length prefix
  }

  // Allocate buffer and write length-prefixed chunks
  const result = new Uint8Array(totalSize);
  const view = new DataView(result.buffer);
  let offset = 0;

  for (const binary of binaryChunks) {
    view.setUint32(offset, binary.length, false); // big-endian
    offset += 4;
    result.set(binary, offset);
    offset += binary.length;
  }

  return result;
}

/**
 * Retry configuration for streamer fetch calls.
 * Uses the same settings as makeRequest for consistency.
 */
const STREAMER_RETRY_OPTIONS = {
  maxRetries: 3,
  shouldRetry: (error: unknown) => {
    // Check for rate limit errors (429)
    if (isRateLimitError(error)) return true;
    // Also retry on fetch errors that indicate a 429 response
    if (error instanceof Error && error.message.includes('429')) return true;
    return false;
  },
};

/**
 * Wrapper for fetch that throws on non-ok responses with status info.
 * This allows the retry logic to properly detect 429 errors.
 */
async function fetchWithErrorHandling(
  url: URL,
  init: RequestInit & { duplex?: 'half' }
): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
    (error as any).status = res.status;
    throw error;
  }
  return res;
}

export function createStreamer(config?: APIConfig): Streamer {
  return {
    async writeToStream(
      name: string,
      runId: string | Promise<string>,
      chunk: string | Uint8Array
    ) {
      // Await runId if it's a promise to ensure proper flushing
      const resolvedRunId = await runId;

      const httpConfig = await getHttpConfig(config);
      await withRetry(
        () =>
          fetchWithErrorHandling(
            getStreamUrl(name, resolvedRunId, httpConfig),
            {
              method: 'PUT',
              body: chunk,
              headers: httpConfig.headers,
              duplex: 'half',
            }
          ),
        STREAMER_RETRY_OPTIONS
      );
    },

    async writeToStreamMulti(
      name: string,
      runId: string | Promise<string>,
      chunks: (string | Uint8Array)[]
    ) {
      if (chunks.length === 0) return;

      // Await runId if it's a promise to ensure proper flushing
      const resolvedRunId = await runId;

      const httpConfig = await getHttpConfig(config);

      // Signal to server that this is a multi-chunk batch
      httpConfig.headers.set('X-Stream-Multi', 'true');

      const body = encodeMultiChunks(chunks);
      await withRetry(
        () =>
          fetchWithErrorHandling(
            getStreamUrl(name, resolvedRunId, httpConfig),
            {
              method: 'PUT',
              body,
              headers: httpConfig.headers,
              duplex: 'half',
            }
          ),
        STREAMER_RETRY_OPTIONS
      );
    },

    async closeStream(name: string, runId: string | Promise<string>) {
      // Await runId if it's a promise to ensure proper flushing
      const resolvedRunId = await runId;

      const httpConfig = await getHttpConfig(config);
      httpConfig.headers.set('X-Stream-Done', 'true');
      await withRetry(
        () =>
          fetchWithErrorHandling(
            getStreamUrl(name, resolvedRunId, httpConfig),
            {
              method: 'PUT',
              headers: httpConfig.headers,
            }
          ),
        STREAMER_RETRY_OPTIONS
      );
    },

    async readFromStream(name: string, startIndex?: number) {
      const httpConfig = await getHttpConfig(config);
      const url = getStreamUrl(name, undefined, httpConfig);
      if (typeof startIndex === 'number') {
        url.searchParams.set('startIndex', String(startIndex));
      }
      const res = await withRetry(
        () => fetchWithErrorHandling(url, { headers: httpConfig.headers }),
        STREAMER_RETRY_OPTIONS
      );
      return res.body as ReadableStream<Uint8Array>;
    },

    async listStreamsByRunId(runId: string) {
      const httpConfig = await getHttpConfig(config);
      const url = new URL(`${httpConfig.baseUrl}/v2/runs/${runId}/streams`);
      const res = await withRetry(
        () => fetchWithErrorHandling(url, { headers: httpConfig.headers }),
        STREAMER_RETRY_OPTIONS
      );
      return (await res.json()) as string[];
    },
  };
}
