import { createWebhook } from 'workflow';

/**
 * Webhook listener parameters
 */
type WebhookListenerParams = {
  /** Timeout duration (e.g., "5m", "1h", "7d") */
  timeout?: string;
  /** Webhook secret for signature verification */
  secret?: string;
};

/**
 * Create durable webhooks that pause workflow execution until triggered.
 *
 * Features:
 * - Generates unique webhook URLs
 * - Pauses workflow execution until webhook is called
 * - Automatic cleanup after timeout
 * - Optional signature verification
 * - Receives and validates webhook payloads
 *
 * The workflow will suspend and resume when the webhook URL is called.
 * No compute resources are consumed while waiting.
 *
 * @param params - Webhook configuration
 * @returns The webhook payload received
 *
 * @example
 * ```typescript
 * // Create webhook and wait for callback
 * const webhook = await createWebhookListener({
 *   timeout: "1h"
 * });
 *
 * // Send the webhook.url to external service
 * await notifyExternalService(webhook.url);
 *
 * // Workflow suspends here until webhook is called
 * const payload = await webhook;
 *
 * console.log("Received webhook data:", payload);
 * ```
 */
export async function createWebhookListener(
  params: WebhookListenerParams = {}
) {
  'use step';

  // Create a webhook that pauses workflow execution
  const webhook = createWebhook({
    timeout: params.timeout || '1h',
    secret: params.secret,
  });

  // The webhook object contains:
  // - webhook.url: The URL to send to external services
  // - webhook.token: Unique token for this webhook
  // - await webhook: Suspends workflow until webhook is called

  return webhook;
}
