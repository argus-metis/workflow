'use server';

/**
 * Server actions for the web package.
 *
 * These wrap the server-side configuration functions from web-shared
 * to make them available as Next.js Server Actions.
 */

import {
  getServerConfig as getServerConfigImpl,
  validateDataDir as validateDataDirImpl,
  getWorldsManifest as getWorldsManifestImpl,
  type ServerConfigResult,
} from '@workflow/web-shared/api/server-config';

export type { ServerConfigResult };
export type {
  ConfigField,
  ServerWorldConfig,
  ConfigMode,
} from '@workflow/web-shared/api/server-config';

/**
 * Get the server-side configuration including environment variables.
 */
export async function getServerConfig(): Promise<ServerConfigResult> {
  return getServerConfigImpl();
}

/**
 * Validate that a data directory exists and contains workflow data.
 */
export async function validateDataDir(
  dataDir: string
): Promise<{ valid: boolean; info?: unknown; error?: string }> {
  return validateDataDirImpl(dataDir);
}

/**
 * Get the bundled worlds manifest data.
 */
export async function getWorldsManifest() {
  return getWorldsManifestImpl();
}
