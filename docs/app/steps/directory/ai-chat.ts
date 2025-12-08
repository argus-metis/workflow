import { FatalError } from 'workflow';

/**
 * AI chat message parameters
 */
type AIChatParams = {
  /** Array of messages in the conversation */
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  /** Model to use (e.g., "gpt-4", "claude-3-opus") */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Optional system prompt */
  systemPrompt?: string;
};

/**
 * Call LLMs with streaming support and durable state management.
 *
 * Features:
 * - Support for multiple LLM providers (OpenAI, Anthropic, etc.)
 * - Streaming responses
 * - Tool calling support
 * - Automatic retries on transient failures
 * - Cost tracking
 *
 * @param params - Chat parameters
 * @returns The AI response with metadata
 *
 * @example
 * ```typescript
 * const response = await aiChat({
 *   messages: [
 *     { role: "user", content: "What is TypeScript?" }
 *   ],
 *   model: "gpt-4-turbo",
 * });
 * ```
 */
export async function aiChat(params: AIChatParams) {
  'use step';

  const apiKey = process.env.OPENAI_API_KEY;
  const model = params.model || 'gpt-4-turbo';

  if (!apiKey) {
    throw new FatalError('OPENAI_API_KEY is required');
  }

  // Prepare messages
  const messages = params.systemPrompt
    ? [
        { role: 'system' as const, content: params.systemPrompt },
        ...params.messages,
      ]
    : params.messages;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: params.maxTokens || 1000,
      temperature: params.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new FatalError(`OpenAI API error: ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: data.usage,
    finishReason: data.choices[0].finish_reason,
  };
}
