import { getVercelOidcToken } from '@vercel/oidc';
import {
  Client,
  DuplicateMessageError,
  JsonTransport,
  parseCallback,
} from '@vercel/queue';
import {
  MessageId,
  type Queue,
  QueuePayloadSchema,
  ValidQueueName,
} from '@workflow/world';
import * as z from 'zod';
import { type APIConfig, getHeaders, getHttpUrl } from './utils.js';

const MessageWrapper = z.object({
  payload: QueuePayloadSchema,
  queueName: ValidQueueName,
  /**
   * The deployment ID to use when re-enqueueing the message.
   * This ensures the message is processed by the same deployment.
   */
  deploymentId: z.string().optional(),
});

/**
 * Message Lifetime Management
 *
 * Vercel Queue messages have a maximum lifetime of 24 hours. After this period,
 * messages are automatically deleted regardless of their visibility timeout.
 * This creates a problem for long-running sleep() or retryAfter delays that
 * exceed 24 hours - the message would be deleted before the handler fires.
 *
 * To handle delays longer than the message lifetime, we use a two-part strategy:
 *
 * 1. **Timeout Clamping**: If the requested timeoutSeconds would cause the message
 *    to expire before the next processing, we clamp the timeout to fit within
 *    the remaining message lifetime. The handler stores the target time in
 *    persistent state (step.retryAfter or wait_created event), so when the
 *    clamped timeout fires, it recalculates the remaining time and returns
 *    another timeout if needed.
 *
 * 2. **Message Re-enqueueing**: If the message is already at or past its safe
 *    lifetime limit (lifetime - buffer), we enqueue a fresh message and
 *    acknowledge the current one. The new message gets a fresh 24-hour clock.
 *    It fires immediately, and the handler short-circuits by checking the
 *    persistent state and returning the remaining timeoutSeconds.
 *
 * TODO: Once Vercel Queue supports NBF (not before) functionality, we can use
 * that when re-enqueueing to schedule the new message for the remaining delay
 * instead of having it fire immediately and short-circuit.
 *
 * These constants can be overridden via environment variables for testing.
 */
const VERCEL_QUEUE_MESSAGE_LIFETIME = Number(
  process.env.VERCEL_QUEUE_MESSAGE_LIFETIME || 86400 // 24 hours in seconds
);
const MESSAGE_LIFETIME_BUFFER = Number(
  process.env.VERCEL_QUEUE_MESSAGE_LIFETIME_BUFFER || 3600 // 1 hour buffer before lifetime expires
);

export function createQueue(config?: APIConfig): Queue {
  const { baseUrl, usingProxy } = getHttpUrl(config);
  const headers = getHeaders(config);
  const queueClient = new Client({
    baseUrl: usingProxy ? baseUrl : undefined,
    // The proxy will strip `/queues` from the path, and add `/api` in front,
    // so this ends up being `/api/v3` when arriving at the queue server,
    // which is the same as the default basePath in VQS client.
    basePath: usingProxy ? '/queues/v3' : undefined,
    token: usingProxy ? config?.token : undefined,
    headers: Object.fromEntries(headers.entries()),
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  });

  const queue: Queue['queue'] = async (queueName, payload, opts) => {
    // Check if we have a deployment ID either from options or environment
    const deploymentId = opts?.deploymentId ?? process.env.VERCEL_DEPLOYMENT_ID;
    if (!deploymentId) {
      throw new Error(
        'No deploymentId provided and VERCEL_DEPLOYMENT_ID environment variable is not set. ' +
          'Queue messages require a deployment ID to route correctly. ' +
          'Either set VERCEL_DEPLOYMENT_ID or provide deploymentId in options.'
      );
    }

    // zod v3 doesn't have the `encode` method. We only support zod v4 officially,
    // but codebases that pin zod v3 are still common.
    const hasEncoder = typeof MessageWrapper.encode === 'function';
    if (!hasEncoder) {
      console.warn(
        'Using zod v3 compatibility mode for queue() calls - this may not work as expected'
      );
    }
    const encoder = hasEncoder
      ? MessageWrapper.encode
      : (data: z.infer<typeof MessageWrapper>) => data;

    const encoded = encoder({
      payload,
      queueName,
      // Store deploymentId in the message so it can be preserved when re-enqueueing
      deploymentId: opts?.deploymentId,
    });
    const sanitizedQueueName = queueName.replace(/[^A-Za-z0-9-_]/g, '-');
    try {
      const { messageId } = await queueClient.send(
        sanitizedQueueName,
        encoded,
        opts
      );
      return { messageId: MessageId.parse(messageId) };
    } catch (error) {
      // Silently handle idempotency key conflicts - the message was already queued
      // This matches the behavior of world-local and world-postgres
      if (error instanceof DuplicateMessageError) {
        // Return a placeholder messageId since the original is not available from the error.
        // Callers using idempotency keys shouldn't depend on the returned messageId.
        // TODO: VQS should return the message ID of the existing message, or we should
        // stop expecting any world to include this
        return {
          messageId: MessageId.parse(
            `msg_duplicate_${error.idempotencyKey ?? opts?.idempotencyKey ?? 'unknown'}`
          ),
        };
      }
      throw error;
    }
  };

  /**
   * Custom callback handler that supports returning { timeoutSeconds } for visibility control.
   *
   * VQS's built-in handleCallback always deletes messages after the handler runs,
   * ignoring the return value. Workflow needs to return { timeoutSeconds } to control
   * when messages should be redelivered (for sleep() and retry delays).
   *
   * This implementation:
   * 1. Parses the CloudEvent to get queue/consumer/message info
   * 2. Receives the message by ID (locks it with visibility timeout)
   * 3. Calls the handler
   * 4. Based on result: deletes (ack) or changes visibility (retry later)
   */
  const createQueueHandler: Queue['createQueueHandler'] = (prefix, handler) => {
    const transport = new JsonTransport();

    // Determine the VQS API base URL
    const vqsBaseUrl = usingProxy
      ? `${baseUrl}/queues/v3`
      : (process.env.VERCEL_QUEUE_BASE_URL || 'https://vercel-queue.com') +
        (process.env.VERCEL_QUEUE_BASE_PATH || '/api/v3/topic');

    const getAuthToken = async (): Promise<string> => {
      if (usingProxy && config?.token) {
        return config.token;
      }
      const token = await getVercelOidcToken();
      if (!token) {
        throw new Error('Failed to get OIDC token');
      }
      return token;
    };

    return async (request: Request): Promise<Response> => {
      try {
        // Parse the CloudEvent to extract queue info
        const { queueName, consumerGroup, messageId } =
          await parseCallback(request);

        // Verify the queue name matches our prefix
        if (!queueName.startsWith(prefix.replace('*', ''))) {
          return Response.json(
            { error: `Queue ${queueName} does not match prefix ${prefix}` },
            { status: 404 }
          );
        }

        const token = await getAuthToken();
        const authHeaders: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          ...Object.fromEntries(headers.entries()),
        };

        const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
        if (deploymentId) {
          authHeaders['Vqs-Deployment-Id'] = deploymentId;
        }

        // Receive message by ID - this locks it with a visibility timeout
        const receiveUrl = `${vqsBaseUrl}/${encodeURIComponent(queueName)}/consumer/${encodeURIComponent(consumerGroup)}/id/${encodeURIComponent(messageId)}`;
        const receiveResponse = await fetch(receiveUrl, {
          method: 'POST',
          headers: {
            ...authHeaders,
            Accept: 'multipart/mixed',
          },
        });

        if (!receiveResponse.ok) {
          const errorText = await receiveResponse.text();
          console.error('Failed to receive message:', {
            status: receiveResponse.status,
            error: errorText,
          });
          return Response.json(
            { error: `Failed to receive message: ${errorText}` },
            { status: receiveResponse.status }
          );
        }

        // Parse the multipart response to get message metadata and payload
        // VQS returns message metadata in headers: Vqs-Message-Id, Vqs-Delivery-Count, Vqs-Timestamp, Vqs-Receipt-Handle
        const receiptHandle = receiveResponse.headers.get('Vqs-Receipt-Handle');
        const deliveryCount = parseInt(
          receiveResponse.headers.get('Vqs-Delivery-Count') || '1',
          10
        );
        const createdAtStr = receiveResponse.headers.get('Vqs-Timestamp');
        const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();

        if (!receiptHandle) {
          return Response.json(
            { error: 'Missing receipt handle in response' },
            { status: 500 }
          );
        }

        // Deserialize the message payload
        const bodyStream = receiveResponse.body;
        if (!bodyStream) {
          return Response.json(
            { error: 'Missing response body' },
            { status: 500 }
          );
        }

        const rawPayload = await transport.deserialize(bodyStream);
        const {
          payload,
          queueName: wrappedQueueName,
          deploymentId: msgDeploymentId,
        } = MessageWrapper.parse(rawPayload);

        // Call the workflow handler
        const result = await handler(payload, {
          queueName: wrappedQueueName,
          messageId: MessageId.parse(messageId),
          attempt: deliveryCount,
        });

        // Determine what to do based on handler result
        let effectiveTimeoutSeconds: number | undefined;

        if (typeof result?.timeoutSeconds === 'number') {
          const now = Date.now();
          const messageAge = (now - createdAt.getTime()) / 1000;
          const maxAllowedTimeout =
            VERCEL_QUEUE_MESSAGE_LIFETIME -
            MESSAGE_LIFETIME_BUFFER -
            messageAge;

          if (maxAllowedTimeout <= 0) {
            // Message is at its lifetime limit - re-enqueue to get a fresh 24-hour clock
            await queue(wrappedQueueName, payload, {
              deploymentId: msgDeploymentId,
            });
            effectiveTimeoutSeconds = undefined; // Will delete the old message
          } else {
            effectiveTimeoutSeconds = Math.min(
              result.timeoutSeconds,
              maxAllowedTimeout
            );
          }
        }

        const leaseUrl = `${vqsBaseUrl}/${encodeURIComponent(queueName)}/consumer/${encodeURIComponent(consumerGroup)}/lease/${encodeURIComponent(receiptHandle)}`;

        if (effectiveTimeoutSeconds !== undefined) {
          // Change visibility timeout - message will be redelivered after timeout
          const patchResponse = await fetch(leaseUrl, {
            method: 'PATCH',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              visibilityTimeoutSeconds: effectiveTimeoutSeconds,
            }),
          });

          if (!patchResponse.ok) {
            const errorText = await patchResponse.text();
            console.error('Failed to change visibility:', {
              status: patchResponse.status,
              error: errorText,
            });
            return Response.json(
              { error: `Failed to change visibility: ${errorText}` },
              { status: patchResponse.status }
            );
          }
        } else {
          // Delete the message - acknowledge successful processing
          const deleteResponse = await fetch(leaseUrl, {
            method: 'DELETE',
            headers: authHeaders,
          });

          if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.error('Failed to delete message:', {
              status: deleteResponse.status,
              error: errorText,
            });
            return Response.json(
              { error: `Failed to delete message: ${errorText}` },
              { status: deleteResponse.status }
            );
          }
        }

        return Response.json({ status: 'success' });
      } catch (error) {
        console.error('Queue callback error:', error);

        // Handle parsing errors
        if (
          error instanceof Error &&
          (error.message.includes('Missing required CloudEvent data fields') ||
            error.message.includes('Invalid CloudEvent') ||
            error.message.includes('Invalid content type') ||
            error.message.includes('Failed to parse CloudEvent'))
        ) {
          return Response.json({ error: error.message }, { status: 400 });
        }

        return Response.json(
          { error: 'Failed to process queue message' },
          { status: 500 }
        );
      }
    };
  };

  const getDeploymentId: Queue['getDeploymentId'] = async () => {
    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
    if (!deploymentId) {
      throw new Error('VERCEL_DEPLOYMENT_ID environment variable is not set');
    }
    return deploymentId;
  };

  return { queue, createQueueHandler, getDeploymentId };
}
