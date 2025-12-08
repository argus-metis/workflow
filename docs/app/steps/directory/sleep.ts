import { sleep } from 'workflow';

/**
 * Sleep parameters
 */
type SleepParams = {
  /** Duration to sleep (e.g., "5s", "10m", "1h", "7d") */
  duration: string;
};

/**
 * Pause workflow execution for a specified duration without consuming resources.
 *
 * The workflow will suspend and no compute resources are consumed while sleeping.
 *
 * @param params - Sleep parameters
 * @returns void
 */
export async function sleepStep(params: SleepParams) {
  'use step';

  await sleep(params.duration);
}
