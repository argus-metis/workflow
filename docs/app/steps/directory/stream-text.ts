import { FatalError } from 'workflow';

/**
 * Stream text parameters
 */
type StreamTextParams = {
  /** The prompt or messages to stream */
  prompt: string;
  /** Model to use */
  model?: string;
  /** Maximum tokens */
  maxTokens?: number;
};

/**
 * Stream LLM responses with resumable streams that survive restarts.
 *
 * @param params - Stream parameters
 * @returns Stream response
 */
export async function streamText(params: StreamTextParams) {
  'use step';

  // TODO: Implement streaming LLM response
  throw new FatalError('Not implemented');
}
