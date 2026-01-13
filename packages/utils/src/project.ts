/**
 * Project validation utilities (server-only).
 *
 * This module contains validation functions that use Node.js APIs and
 * should only be used in server environments.
 *
 * For client-safe types and utilities, import from './project-types.js'.
 */

import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { findWorkflowDataDir } from './check-data-dir.js';
import {
  getWorldById,
  type WorldDefinition,
} from './worlds-manifest.js';
import type {
  Project,
  ProjectValidationError,
  ProjectValidationResult,
} from './project-types.js';

// Re-export types and client-safe functions
export type {
  Project,
  ProjectValidationError,
  ProjectValidationResult,
} from './project-types.js';
export {
  generateProjectId,
  createProject,
  projectToEnvMap,
  isVercelWorld,
  getProjectCacheKey,
} from './project-types.js';

/**
 * Validate that all required environment variables are present
 */
function validateRequiredEnvVars(
  project: Project,
  world: WorldDefinition
): ProjectValidationError[] {
  const errors: ProjectValidationError[] = [];

  for (const envVar of world.requiredEnv) {
    const value = project.envMap[envVar];
    if (!value || value.trim() === '') {
      errors.push({
        field: envVar,
        message: `${envVar} is required for ${world.name} world`,
        critical: true,
      });
    }
  }

  return errors;
}

/**
 * Validate local world specific configuration
 */
async function validateLocalWorld(
  project: Project
): Promise<ProjectValidationError[]> {
  const errors: ProjectValidationError[] = [];
  const dataDir = project.envMap.WORKFLOW_LOCAL_DATA_DIR || project.projectDir;

  // Check if data directory exists and is accessible
  try {
    const resolvedPath = resolve(dataDir);
    await access(resolvedPath);

    // Try to find workflow data directory
    const dataDirInfo = await findWorkflowDataDir(resolvedPath);
    if (dataDirInfo.error) {
      errors.push({
        field: 'WORKFLOW_LOCAL_DATA_DIR',
        message: dataDirInfo.error,
        critical: false, // Not critical - directory might be created later
      });
    }
  } catch {
    errors.push({
      field: 'WORKFLOW_LOCAL_DATA_DIR',
      message: `Data directory does not exist or is not accessible: ${dataDir}`,
      critical: false, // Not critical - directory might be created later
    });
  }

  // Validate port if provided
  const port = project.envMap.PORT;
  if (port) {
    const portNum = Number.parseInt(port, 10);
    if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push({
        field: 'PORT',
        message: 'Port must be a number between 1 and 65535',
        critical: true,
      });
    }
  }

  return errors;
}

/**
 * Validate Vercel world specific configuration
 */
async function validateVercelWorld(
  project: Project
): Promise<ProjectValidationError[]> {
  const errors: ProjectValidationError[] = [];

  // For Vercel world, we can't really validate the connection without making API calls
  // But we can check the format of certain values

  const project_id = project.envMap.WORKFLOW_VERCEL_PROJECT;
  if (project_id && !project_id.trim()) {
    errors.push({
      field: 'WORKFLOW_VERCEL_PROJECT',
      message: 'Project ID cannot be empty',
      critical: true,
    });
  }

  const team_id = project.envMap.WORKFLOW_VERCEL_TEAM;
  if (team_id && !team_id.trim()) {
    errors.push({
      field: 'WORKFLOW_VERCEL_TEAM',
      message: 'Team ID cannot be empty',
      critical: true,
    });
  }

  const env = project.envMap.WORKFLOW_VERCEL_ENV;
  if (env && !['production', 'preview'].includes(env)) {
    errors.push({
      field: 'WORKFLOW_VERCEL_ENV',
      message: 'Environment must be "production" or "preview"',
      critical: false,
    });
  }

  return errors;
}

/**
 * Validate Postgres world specific configuration
 */
async function validatePostgresWorld(
  project: Project
): Promise<ProjectValidationError[]> {
  const errors: ProjectValidationError[] = [];
  const url = project.envMap.WORKFLOW_POSTGRES_URL;

  if (url) {
    if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
      errors.push({
        field: 'WORKFLOW_POSTGRES_URL',
        message:
          'Invalid PostgreSQL connection string format (must start with postgres:// or postgresql://)',
        critical: true,
      });
    }
  }

  return errors;
}

/**
 * Validate a project configuration.
 *
 * For known worlds, this checks required env vars and performs world-specific validation.
 * For unknown worlds, it only checks that the project has some env vars defined.
 *
 * NOTE: This function uses Node.js APIs and should only be called in server environments.
 *
 * @param project - The project to validate
 * @returns Validation result with errors (if any)
 */
export async function validateProject(
  project: Project
): Promise<ProjectValidationResult> {
  const errors: ProjectValidationError[] = [];
  const world = getWorldById(project.worldId);

  // If this is a known world, validate against manifest
  if (world) {
    // Check required env vars
    errors.push(...validateRequiredEnvVars(project, world));

    // World-specific validation
    if (project.worldId === 'local') {
      errors.push(...(await validateLocalWorld(project)));
    } else if (project.worldId === 'vercel') {
      errors.push(...(await validateVercelWorld(project)));
    } else if (project.worldId === 'postgres') {
      errors.push(...(await validatePostgresWorld(project)));
    }
    // Other known worlds just need their required env vars to be present
    // (already checked above)

    return {
      valid: errors.filter((e) => e.critical).length === 0,
      errors,
      world,
    };
  }

  // For unknown worlds, we can't validate much
  // Just ensure WORKFLOW_TARGET_WORLD is set if using custom package
  if (!project.envMap.WORKFLOW_TARGET_WORLD) {
    // If worldId is a package name, auto-set it
    if (project.worldId.includes('/') || project.worldId.includes('@')) {
      project.envMap.WORKFLOW_TARGET_WORLD = project.worldId;
    } else {
      errors.push({
        field: 'WORKFLOW_TARGET_WORLD',
        message:
          'For custom worlds, WORKFLOW_TARGET_WORLD must be set to the package name',
        critical: true,
      });
    }
  }

  return {
    valid: errors.filter((e) => e.critical).length === 0,
    errors,
  };
}
