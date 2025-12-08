import { FatalError } from 'workflow';

/**
 * Parameters for sending a Slack message
 */
type SlackMessageParams = {
  /** Slack channel ID or name (e.g., "#general" or "C1234567890") */
  channel: string;
  /** The message text to send */
  text: string;
  /** Optional Slack blocks for rich formatting */
  blocks?: any[];
  /** Optional thread timestamp to reply in a thread */
  thread_ts?: string;
};

/**
 * Send a message to a Slack channel or user using the Slack API.
 *
 * This step integrates with Slack to send messages with support for:
 * - Plain text messages
 * - Rich formatting with Slack blocks
 * - Thread replies
 * - Automatic retries on failure
 *
 * @param params - The Slack message parameters
 * @returns The Slack API response including the message timestamp
 *
 * @example
 * ```typescript
 * const result = await sendSlackMessage({
 *   channel: "#notifications",
 *   text: "Deployment completed successfully!",
 * });
 * ```
 */
export async function sendSlackMessage(params: SlackMessageParams) {
  'use step';

  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new FatalError('SLACK_BOT_TOKEN is required');
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new FatalError(`Slack API error: ${data.error}`);
  }

  return data;
}
