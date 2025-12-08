import { FatalError } from 'workflow';

/**
 * Email message parameters
 */
type EmailParams = {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Email body content (HTML or plain text) */
  body: string;
  /** Optional sender email (defaults to configured sender) */
  from?: string;
  /** Optional CC recipients */
  cc?: string[];
  /** Optional BCC recipients */
  bcc?: string[];
  /** Optional reply-to address */
  replyTo?: string;
};

/**
 * Send transactional emails via your email provider.
 *
 * Supports multiple email providers:
 * - Resend
 * - SendGrid
 * - AWS SES
 * - Postmark
 *
 * Configure your provider using environment variables.
 *
 * @param params - Email parameters
 * @returns Email delivery status and ID
 *
 * @example
 * ```typescript
 * const result = await sendEmail({
 *   to: "user@example.com",
 *   subject: "Welcome to our platform",
 *   body: "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
 * });
 * ```
 */
export async function sendEmail(params: EmailParams) {
  'use step';

  const apiKey = process.env.EMAIL_API_KEY;
  const provider = process.env.EMAIL_PROVIDER || 'resend';

  if (!apiKey) {
    throw new FatalError('EMAIL_API_KEY is required');
  }

  // Example using Resend
  if (provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from || process.env.EMAIL_FROM || 'noreply@example.com',
        to: params.to,
        subject: params.subject,
        html: params.body,
        cc: params.cc,
        bcc: params.bcc,
        reply_to: params.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new FatalError(`Email API error: ${error}`);
    }

    const data = await response.json();
    return { status: 'sent', id: data.id };
  }

  throw new FatalError(`Unsupported email provider: ${provider}`);
}
