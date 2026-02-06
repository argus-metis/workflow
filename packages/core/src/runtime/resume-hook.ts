import { waitUntil } from '@vercel/functions';
import { ERROR_SLUGS, WorkflowRuntimeError } from '@workflow/errors';
import {
  type Encryptor,
  type Hook,
  isLegacySpecVersion,
  SPEC_VERSION_CURRENT,
  type WorkflowInvokePayload,
} from '@workflow/world';
import {
  dehydrateStepReturnValue,
  hydrateStepArguments,
} from '../serialization.js';
import { WEBHOOK_RESPONSE_WRITABLE } from '../symbols.js';
import * as Attribute from '../telemetry/semantic-conventions.js';
import { getSpanContextForTraceCarrier, trace } from '../telemetry.js';
import { waitedUntil } from '../util.js';
import { getWorkflowQueueName } from './helpers.js';
import { getWorld } from './world.js';

/**
 * Resolve the appropriate Encryptor for a given workflow run.
 *
 * Uses `world.getEncryptorForRun()` when available (needed for cross-deployment
 * scenarios like `resumeHook()` called from a different deployment). Falls back
 * to the world itself (which works for same-deployment operations).
 */
async function resolveEncryptorForRun(runId: string): Promise<Encryptor> {
  const world = getWorld();
  if (world.getEncryptorForRun) {
    return world.getEncryptorForRun(runId);
  }
  return world;
}

/**
 * Get the hook by token to find the associated workflow run,
 * and hydrate the `metadata` property if it was set from within
 * the workflow run.
 *
 * @param token - The unique token identifying the hook
 */
export async function getHookByToken(token: string): Promise<Hook> {
  const { hook } = await getHookByTokenWithEncryptor(token);
  return hook;
}

/**
 * Internal: Get the hook by token and also return the resolved encryptor,
 * so callers like `resumeHook()` can reuse it for payload encryption
 * without a redundant key resolution.
 */
async function getHookByTokenWithEncryptor(
  token: string
): Promise<{ hook: Hook; encryptor: Encryptor }> {
  const world = getWorld();
  const hook = await world.hooks.getByToken(token);

  // Resolve the encryptor for the target run — metadata was encrypted
  // by the workflow run's deployment, which may differ from the current one
  const encryptor = await resolveEncryptorForRun(hook.runId);

  if (typeof hook.metadata !== 'undefined') {
    hook.metadata = await hydrateStepArguments(
      hook.metadata as any,
      hook.runId,
      encryptor
    );
  }
  return { hook, encryptor };
}

/**
 * Resumes a workflow run by sending a payload to a hook identified by its token.
 *
 * This function is called externally (e.g., from an API route or server action)
 * to send data to a hook and resume the associated workflow run.
 *
 * @param tokenOrHook - The unique token identifying the hook, or the hook object itself
 * @param payload - The data payload to send to the hook
 * @returns Promise resolving to the hook
 * @throws Error if the hook is not found or if there's an error during the process
 *
 * @example
 *
 * ```ts
 * // In an API route
 * import { resumeHook } from '@workflow/core/runtime';
 *
 * export async function POST(request: Request) {
 *   const { token, data } = await request.json();
 *
 *   try {
 *     const hook = await resumeHook(token, data);
 *     return Response.json({ runId: hook.runId });
 *   } catch (error) {
 *     return new Response('Hook not found', { status: 404 });
 *   }
 * }
 * ```
 */
export async function resumeHook<T = any>(
  tokenOrHook: string | Hook,
  payload: T,
  /** @internal Pre-resolved encryptor to avoid redundant key resolution */
  _encryptor?: Encryptor
): Promise<Hook> {
  return await waitedUntil(() => {
    return trace('hook.resume', async (span) => {
      const world = getWorld();

      try {
        let hook: Hook;
        let encryptor: Encryptor;
        if (typeof tokenOrHook === 'string') {
          // Resolve hook + encryptor together — single key resolution
          // covers both metadata decryption and payload encryption
          const result = await getHookByTokenWithEncryptor(tokenOrHook);
          hook = result.hook;
          encryptor = result.encryptor;
        } else {
          hook = tokenOrHook;
          encryptor = _encryptor ?? (await resolveEncryptorForRun(hook.runId));
        }

        span?.setAttributes({
          ...Attribute.HookToken(hook.token),
          ...Attribute.HookId(hook.hookId),
          ...Attribute.WorkflowRunId(hook.runId),
        });

        // Dehydrate the payload for storage (reusing the same encryptor)
        const ops: Promise<any>[] = [];
        const v1Compat = isLegacySpecVersion(hook.specVersion);
        const dehydratedPayload = await dehydrateStepReturnValue(
          payload,
          hook.runId,
          encryptor,
          ops,
          globalThis,
          v1Compat
        );
        // NOTE: Workaround instead of injecting catching undefined unhandled rejections in webhook bundle
        waitUntil(
          Promise.all(ops).catch((err) => {
            if (err !== undefined) throw err;
          })
        );

        // Create a hook_received event with the payload
        await world.events.create(
          hook.runId,
          {
            eventType: 'hook_received',
            specVersion: SPEC_VERSION_CURRENT,
            correlationId: hook.hookId,
            eventData: {
              payload: dehydratedPayload,
            },
          },
          { v1Compat }
        );

        const workflowRun = await world.runs.get(hook.runId);

        span?.setAttributes({
          ...Attribute.WorkflowName(workflowRun.workflowName),
        });

        const traceCarrier = workflowRun.executionContext?.traceCarrier;

        if (traceCarrier) {
          const context = await getSpanContextForTraceCarrier(traceCarrier);
          if (context) {
            span?.addLink?.({ context });
          }
        }

        // Re-trigger the workflow against the deployment ID associated
        // with the workflow run that the hook belongs to
        await world.queue(
          getWorkflowQueueName(workflowRun.workflowName),
          {
            runId: hook.runId,
            // attach the trace carrier from the workflow run
            traceCarrier:
              workflowRun.executionContext?.traceCarrier ?? undefined,
          } satisfies WorkflowInvokePayload,
          {
            deploymentId: workflowRun.deploymentId,
          }
        );

        return hook;
      } catch (err) {
        span?.setAttributes({
          ...Attribute.HookToken(
            typeof tokenOrHook === 'string' ? tokenOrHook : tokenOrHook.token
          ),
          ...Attribute.HookFound(false),
        });
        throw err;
      }
    });
  });
}

/**
 * Resumes a webhook by sending a {@link https://developer.mozilla.org/en-US/docs/Web/API/Request | Request}
 * object to a hook identified by its token.
 *
 * This function is called externally (e.g., from an API route or server action)
 * to send a request to a webhook and resume the associated workflow run.
 *
 * @param token - The unique token identifying the hook
 * @param request - The request to send to the hook
 * @returns Promise resolving to the response
 * @throws Error if the hook is not found or if there's an error during the process
 *
 * @example
 *
 * ```ts
 * // In an API route
 * import { resumeWebhook } from '@workflow/core/runtime';
 *
 * export async function POST(request: Request) {
 *   const url = new URL(request.url);
 *   const token = url.searchParams.get('token');
 *
 *   if (!token) {
 *     return new Response('Missing token', { status: 400 });
 *   }
 *
 *   try {
 *     const response = await resumeWebhook(token, request);
 *     return response;
 *   } catch (error) {
 *     return new Response('Webhook not found', { status: 404 });
 *   }
 * }
 * ```
 */
export async function resumeWebhook(
  token: string,
  request: Request
): Promise<Response> {
  // Resolve hook + encryptor together — single key resolution covers
  // metadata decryption and payload encryption in resumeHook below
  const { hook, encryptor } = await getHookByTokenWithEncryptor(token);

  let response: Response | undefined;
  let responseReadable: ReadableStream<Response> | undefined;
  if (
    hook.metadata &&
    typeof hook.metadata === 'object' &&
    'respondWith' in hook.metadata
  ) {
    if (hook.metadata.respondWith === 'manual') {
      const { readable, writable } = new TransformStream<Response, Response>();
      responseReadable = readable;

      // The request instance includes the writable stream which will be used
      // to write the response to the client from within the workflow run
      (request as any)[WEBHOOK_RESPONSE_WRITABLE] = writable;
    } else if (hook.metadata.respondWith instanceof Response) {
      response = hook.metadata.respondWith;
    } else {
      throw new WorkflowRuntimeError(
        `Invalid \`respondWith\` value: ${hook.metadata.respondWith}`,
        { slug: ERROR_SLUGS.WEBHOOK_INVALID_RESPOND_WITH_VALUE }
      );
    }
  } else {
    // No `respondWith` value implies the default behavior of returning a 202
    response = new Response(null, { status: 202 });
  }

  await resumeHook(hook, request, encryptor);

  if (responseReadable) {
    // Wait for the readable stream to emit one chunk,
    // which is the `Response` object
    const reader = responseReadable.getReader();
    const chunk = await reader.read();
    if (chunk.value) {
      response = chunk.value;
    }
    reader.cancel();
  }

  if (!response) {
    throw new WorkflowRuntimeError('Workflow run did not send a response', {
      slug: ERROR_SLUGS.WEBHOOK_RESPONSE_NOT_SENT,
    });
  }

  return response;
}
