import { FatalError } from 'workflow';

/**
 * SMS parameters
 */
type SendSMSParams = {
  /** Phone number to send to */
  to: string;
  /** Message body */
  body: string;
  /** Optional from number */
  from?: string;
};

/**
 * Send SMS messages via Twilio with delivery confirmation.
 *
 * @param params - SMS parameters
 * @returns Delivery status
 */
export async function sendSMS(params: SendSMSParams) {
  'use step';

  // TODO: Implement SMS sending via Twilio
  throw new FatalError('Not implemented');
}
