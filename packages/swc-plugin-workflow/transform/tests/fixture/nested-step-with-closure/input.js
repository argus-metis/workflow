import { DurableAgent } from '@workflow/ai/agent';
import { gateway } from 'ai';

export async function wflow() {
  'use workflow';
  let count = 42;
  const agent = new DurableAgent({
    model: async () => {
      'use step';
      console.log('count', count);
      return gateway('openai/gpt-5');
    },
  });
}
