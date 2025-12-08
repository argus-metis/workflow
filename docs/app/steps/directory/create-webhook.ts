import { createWebhook } from 'workflow';

/**
 * Create webhook parameters
 */
type CreateWebhookParams = {
  /** Webhook timeout */
  timeout?: string;
  /** Optional webhook secret */
  secret?: string;
};

/**
 * Create webhooks that pause workflow execution until called.
 *
 * @param params - Webhook parameters
 * @returns Webhook object
 */
export async function createWebhookStep(params: CreateWebhookParams = {}) {
  'use step';

  const webhook = createWebhook(params);
  return webhook;
}
