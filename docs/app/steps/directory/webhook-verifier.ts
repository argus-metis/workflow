import { FatalError } from 'workflow';

/**
 * Webhook verifier parameters
 */
type WebhookVerifierParams = {
  /** Webhook payload */
  payload: string;
  /** Signature to verify */
  signature: string;
  /** Secret key */
  secret: string;
  /** Provider (e.g., "github", "stripe") */
  provider?: string;
};

/**
 * Verify webhook signatures from popular services.
 *
 * @param params - Verification parameters
 * @returns Whether the webhook is valid
 */
export async function webhookVerifier(params: WebhookVerifierParams) {
  'use step';

  // TODO: Implement webhook signature verification
  throw new FatalError('Not implemented');
}
