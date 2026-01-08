'use server';

/**
 * Server actions for the web package.
 *
 * This file re-exports server actions from web-shared and adds any
 * web-package-specific server actions.
 */

export {
  getServerConfig,
  validateDataDir,
  getWorldsManifest,
} from '@workflow/web-shared/api/server-config';
