'use server';

import { getSelfHostingMode } from '@workflow/web-shared/server';

/**
 * Server function to check if the app is in self-hosting mode.
 * This should be called from a server component.
 */
export async function checkSelfHostingMode(): Promise<boolean> {
  const result = await getSelfHostingMode();
  return result.success ? result.data : false;
}
