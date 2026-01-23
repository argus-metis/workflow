import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to define mocks that will be available to vi.mock
const {
  mockSend,
  mockParseCallback,
  mockDeserialize,
  mockGetOidcToken,
  MockDuplicateMessageError,
} = vi.hoisted(() => {
  // DuplicateMessageError mock class
  class MockDuplicateMessageError extends Error {
    public readonly idempotencyKey?: string;
    constructor(message: string, idempotencyKey?: string) {
      super(message);
      this.name = 'DuplicateMessageError';
      this.idempotencyKey = idempotencyKey;
    }
  }

  return {
    mockSend: vi.fn(),
    mockParseCallback: vi.fn(),
    mockDeserialize: vi.fn(),
    mockGetOidcToken: vi.fn(),
    MockDuplicateMessageError,
  };
});

vi.mock('@vercel/queue', () => ({
  Client: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  DuplicateMessageError: MockDuplicateMessageError,
  JsonTransport: vi.fn().mockImplementation(() => ({
    deserialize: mockDeserialize,
  })),
  parseCallback: mockParseCallback,
}));

vi.mock('@vercel/oidc', () => ({
  getVercelOidcToken: mockGetOidcToken,
}));

// Mock utils
vi.mock('./utils.js', () => ({
  getHttpUrl: vi
    .fn()
    .mockReturnValue({ baseUrl: 'http://localhost:3000', usingProxy: false }),
  getHeaders: vi.fn().mockReturnValue(new Map()),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { createQueue } from './queue.js';

describe('createQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOidcToken.mockResolvedValue('test-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('queue()', () => {
    it('should send message with payload and queueName', async () => {
      mockSend.mockResolvedValue({ messageId: 'msg-123' });

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_test';

      try {
        const queue = createQueue();
        await queue.queue('__wkf_workflow_test', { runId: 'run-123' });

        expect(mockSend).toHaveBeenCalledTimes(1);
        const sentPayload = mockSend.mock.calls[0][1];

        expect(sentPayload.payload).toEqual({ runId: 'run-123' });
        expect(sentPayload.queueName).toBe('__wkf_workflow_test');
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });

    it('should throw when no deploymentId and VERCEL_DEPLOYMENT_ID is not set', async () => {
      mockSend.mockResolvedValue({ messageId: 'msg-123' });

      // Ensure VERCEL_DEPLOYMENT_ID is not set
      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      delete process.env.VERCEL_DEPLOYMENT_ID;

      try {
        const queue = createQueue();
        await expect(
          queue.queue('__wkf_workflow_test', { runId: 'run-123' })
        ).rejects.toThrow(
          'No deploymentId provided and VERCEL_DEPLOYMENT_ID environment variable is not set'
        );
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        }
      }
    });

    it('should not throw when deploymentId is provided in options', async () => {
      mockSend.mockResolvedValue({ messageId: 'msg-123' });

      // Ensure VERCEL_DEPLOYMENT_ID is not set
      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      delete process.env.VERCEL_DEPLOYMENT_ID;

      try {
        const queue = createQueue();
        await expect(
          queue.queue(
            '__wkf_workflow_test',
            { runId: 'run-123' },
            { deploymentId: 'dpl_123' }
          )
        ).resolves.toEqual({ messageId: 'msg-123' });
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        }
      }
    });

    it('should not throw when VERCEL_DEPLOYMENT_ID is set', async () => {
      mockSend.mockResolvedValue({ messageId: 'msg-123' });

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_env_123';

      try {
        const queue = createQueue();
        await expect(
          queue.queue('__wkf_workflow_test', { runId: 'run-123' })
        ).resolves.toEqual({ messageId: 'msg-123' });
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });

    it('should silently handle idempotency key conflicts', async () => {
      mockSend.mockRejectedValue(
        new MockDuplicateMessageError(
          'Duplicate idempotency key detected',
          'my-key'
        )
      );

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_test';

      try {
        const queue = createQueue();
        const result = await queue.queue(
          '__wkf_workflow_test',
          { runId: 'run-123' },
          { idempotencyKey: 'my-key' }
        );

        // Should not throw, and should return a placeholder messageId
        // Uses error.idempotencyKey when available
        expect(result.messageId).toBe('msg_duplicate_my-key');
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });

    it('should rethrow non-idempotency errors', async () => {
      mockSend.mockRejectedValue(new Error('Some other error'));

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_test';

      try {
        const queue = createQueue();
        await expect(
          queue.queue('__wkf_workflow_test', { runId: 'run-123' })
        ).rejects.toThrow('Some other error');
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });
  });

  describe('createQueueHandler()', () => {
    // Helper to set up a request handler test
    function setupHandlerTest(options: {
      handlerResult: { timeoutSeconds: number } | void;
      messagePayload: unknown;
      queueName: string;
      messageId?: string;
      createdAt?: Date;
      deploymentId?: string;
    }) {
      const {
        handlerResult,
        messagePayload,
        queueName,
        messageId = 'msg-123',
        createdAt = new Date(),
        deploymentId,
      } = options;

      // Mock parseCallback to return CloudEvent data
      mockParseCallback.mockResolvedValue({
        queueName,
        consumerGroup: 'default',
        messageId,
      });

      // Mock the receive message response
      const receiveHeaders = new Headers({
        'Vqs-Receipt-Handle': 'receipt-123',
        'Vqs-Delivery-Count': '1',
        'Vqs-Timestamp': createdAt.toISOString(),
      });

      // Create a readable stream for the body
      const messageWrapper = {
        payload: messagePayload,
        queueName,
        deploymentId,
      };

      mockDeserialize.mockResolvedValue(messageWrapper);

      const receiveResponse = new Response(JSON.stringify(messageWrapper), {
        status: 200,
        headers: receiveHeaders,
      });

      // Track fetch calls
      const fetchCalls: Array<{ url: string; method: string; body?: string }> =
        [];
      mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
        fetchCalls.push({
          url,
          method: init?.method || 'GET',
          body: init?.body?.toString(),
        });

        if (init?.method === 'POST' && url.includes('/id/')) {
          return receiveResponse;
        }
        if (init?.method === 'DELETE' || init?.method === 'PATCH') {
          return new Response(null, { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      });

      return { fetchCalls, handlerResult };
    }

    it('should call PATCH with timeoutSeconds when handler returns timeout', async () => {
      const { fetchCalls } = setupHandlerTest({
        handlerResult: { timeoutSeconds: 50000 },
        messagePayload: { runId: 'run-123' },
        queueName: '__wkf_workflow_test',
      });

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_test';

      try {
        const queue = createQueue();
        const handler = queue.createQueueHandler(
          '__wkf_workflow_',
          async () => ({ timeoutSeconds: 50000 })
        );

        const request = new Request('http://localhost/api/queue', {
          method: 'POST',
          headers: { 'content-type': 'application/cloudevents+json' },
          body: JSON.stringify({}),
        });

        const response = await handler(request);
        expect(response.status).toBe(200);

        // Should have called PATCH to change visibility (not DELETE)
        const patchCall = fetchCalls.find((c) => c.method === 'PATCH');
        expect(patchCall).toBeDefined();
        expect(patchCall?.body).toContain('visibilityTimeoutSeconds');

        const deleteCall = fetchCalls.find((c) => c.method === 'DELETE');
        expect(deleteCall).toBeUndefined();
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });

    it('should call DELETE when handler returns void', async () => {
      const { fetchCalls } = setupHandlerTest({
        handlerResult: undefined,
        messagePayload: { runId: 'run-123' },
        queueName: '__wkf_workflow_test',
      });

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_test';

      try {
        const queue = createQueue();
        const handler = queue.createQueueHandler(
          '__wkf_workflow_',
          async () => undefined
        );

        const request = new Request('http://localhost/api/queue', {
          method: 'POST',
          headers: { 'content-type': 'application/cloudevents+json' },
          body: JSON.stringify({}),
        });

        const response = await handler(request);
        expect(response.status).toBe(200);

        // Should have called DELETE (not PATCH)
        const deleteCall = fetchCalls.find((c) => c.method === 'DELETE');
        expect(deleteCall).toBeDefined();

        const patchCall = fetchCalls.find((c) => c.method === 'PATCH');
        expect(patchCall).toBeUndefined();
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });

    it('should clamp timeoutSeconds when message has limited lifetime remaining', async () => {
      // Message that was created 22 hours ago
      // maxAllowedTimeout = 86400 - 3600 - 79200 = 3600s (1 hour)
      const oldMessageTime = new Date(Date.now() - 22 * 60 * 60 * 1000);

      const { fetchCalls } = setupHandlerTest({
        handlerResult: { timeoutSeconds: 7200 }, // Request 2 hours
        messagePayload: { runId: 'run-123' },
        queueName: '__wkf_workflow_test',
        createdAt: oldMessageTime,
      });

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_test';

      try {
        const queue = createQueue();
        const handler = queue.createQueueHandler(
          '__wkf_workflow_',
          async () => ({ timeoutSeconds: 7200 })
        );

        const request = new Request('http://localhost/api/queue', {
          method: 'POST',
          headers: { 'content-type': 'application/cloudevents+json' },
          body: JSON.stringify({}),
        });

        const response = await handler(request);
        expect(response.status).toBe(200);

        // Should have called PATCH with clamped timeout (~3600s)
        const patchCall = fetchCalls.find((c) => c.method === 'PATCH');
        expect(patchCall).toBeDefined();
        const body = JSON.parse(patchCall!.body!);
        // Should be clamped to around 3600 (give or take a few seconds for test timing)
        expect(body.visibilityTimeoutSeconds).toBeLessThanOrEqual(3600);
        expect(body.visibilityTimeoutSeconds).toBeGreaterThan(3500);
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });

    it('should re-enqueue and DELETE when message has no lifetime remaining', async () => {
      mockSend.mockResolvedValue({ messageId: 'new-msg-123' });

      // Message that was created 23 hours ago (at the buffer limit)
      // maxAllowedTimeout = 86400 - 3600 - 82800 = 0s
      const oldMessageTime = new Date(Date.now() - 23 * 60 * 60 * 1000);

      const { fetchCalls } = setupHandlerTest({
        handlerResult: { timeoutSeconds: 3600 },
        messagePayload: { runId: 'run-123' },
        queueName: '__wkf_workflow_test',
        createdAt: oldMessageTime,
        deploymentId: 'dpl_original',
      });

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_test';

      try {
        const queue = createQueue();
        const handler = queue.createQueueHandler(
          '__wkf_workflow_',
          async () => ({ timeoutSeconds: 3600 })
        );

        const request = new Request('http://localhost/api/queue', {
          method: 'POST',
          headers: { 'content-type': 'application/cloudevents+json' },
          body: JSON.stringify({}),
        });

        const response = await handler(request);
        expect(response.status).toBe(200);

        // Should have re-enqueued via mockSend
        expect(mockSend).toHaveBeenCalledTimes(1);
        const sentPayload = mockSend.mock.calls[0][1];
        expect(sentPayload.payload).toEqual({ runId: 'run-123' });

        // Should have called DELETE to ack the old message (not PATCH)
        const deleteCall = fetchCalls.find((c) => c.method === 'DELETE');
        expect(deleteCall).toBeDefined();

        const patchCall = fetchCalls.find((c) => c.method === 'PATCH');
        expect(patchCall).toBeUndefined();
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });

    it('should handle step payloads correctly', async () => {
      mockSend.mockResolvedValue({ messageId: 'new-msg-123' });

      // Old message approaching expiry
      const oldMessageTime = new Date(Date.now() - 23 * 60 * 60 * 1000);

      const stepPayload = {
        workflowName: 'test-workflow',
        workflowRunId: 'run-123',
        workflowStartedAt: Date.now(),
        stepId: 'step-456',
      };

      setupHandlerTest({
        handlerResult: { timeoutSeconds: 3600 },
        messagePayload: stepPayload,
        queueName: '__wkf_step_myStep',
        createdAt: oldMessageTime,
        deploymentId: 'dpl_original',
      });

      const originalEnv = process.env.VERCEL_DEPLOYMENT_ID;
      process.env.VERCEL_DEPLOYMENT_ID = 'dpl_test';

      try {
        const queue = createQueue();
        const handler = queue.createQueueHandler(
          '__wkf_step_',
          async () => ({ timeoutSeconds: 3600 })
        );

        const request = new Request('http://localhost/api/queue', {
          method: 'POST',
          headers: { 'content-type': 'application/cloudevents+json' },
          body: JSON.stringify({}),
        });

        await handler(request);

        // Should have re-enqueued with correct payload
        expect(mockSend).toHaveBeenCalledTimes(1);
        const sentPayload = mockSend.mock.calls[0][1];
        expect(sentPayload.payload).toEqual(stepPayload);
      } finally {
        if (originalEnv !== undefined) {
          process.env.VERCEL_DEPLOYMENT_ID = originalEnv;
        } else {
          delete process.env.VERCEL_DEPLOYMENT_ID;
        }
      }
    });
  });
});
