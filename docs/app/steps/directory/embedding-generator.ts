import { FatalError } from 'workflow';

/**
 * Embedding generator parameters
 */
type EmbeddingParams = {
  /** Text to generate embeddings for */
  text: string | string[];
  /** Model to use for embeddings */
  model?: string;
};

/**
 * Generate vector embeddings for text with batching support.
 *
 * @param params - Embedding parameters
 * @returns Vector embeddings
 */
export async function generateEmbeddings(params: EmbeddingParams) {
  'use step';

  // TODO: Implement embedding generation
  throw new FatalError('Not implemented');
}
