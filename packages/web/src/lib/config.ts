'use client';

import type { EnvMap } from '@workflow/web-shared/server';
import type { WorldConfig } from '@/lib/config-world';

/**
 * Resolve a world ID to its package name for WORKFLOW_TARGET_WORLD.
 * Note: For "local" and "vercel", we pass through directly since
 * createWorld() handles these as special cases.
 */
export const resolveTargetWorld = (backend?: string) => {
  switch (backend) {
    case 'local':
      return 'local'; // createWorld() handles this directly
    case 'vercel':
      return 'vercel'; // createWorld() handles this directly
    case 'postgres':
      return '@workflow/world-postgres';
    default:
      return backend;
  }
};

export const worldConfigToEnvMap = (config: WorldConfig): EnvMap => {
  return {
    WORKFLOW_TARGET_WORLD: resolveTargetWorld(config.backend),
    WORKFLOW_VERCEL_ENV: config.env,
    WORKFLOW_VERCEL_AUTH_TOKEN: config.authToken,
    WORKFLOW_VERCEL_PROJECT: config.project,
    WORKFLOW_VERCEL_TEAM: config.team,
    PORT: config.port,
    WORKFLOW_MANIFEST_PATH: config.manifestPath,
    WORKFLOW_LOCAL_DATA_DIR: config.dataDir,
    // Postgres env vars
    WORKFLOW_POSTGRES_URL: config.postgresUrl,
  };
};
