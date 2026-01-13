/**
 * Project type and validation for workflow observability.
 *
 * A Project represents a configuration for connecting to a workflow world,
 * encapsulating all the environment variables and metadata needed.
 */

import {
  findWorkflowDataDir,
  type WorkflowDataDirInfo,
} from './check-data-dir.js';
import {
  getWorldById,
  isLocalWorld,
  isVercelWorld,
  type WorldManifestEntry,
} from './worlds-manifest.js';

/**
 * Represents a configured project for workflow observability.
 */
export interface Project {
  /** Unique identifier for this project instance */
  id: string;
  /** Human-readable name for this project (derived from projectDir or custom) */
  name: string;
  /** The world ID (e.g., 'local', 'vercel', 'postgres') */
  worldId: string;
  /** Map of all environment variables for this world */
  envMap: Record<string, string | undefined>;
  /**
   * Directory from which the UI was invoked, independent of backend.
   * Useful for associating projects with source folders.
   */
  projectDir: string;
  /** Timestamp when this project was created */
  createdAt: number;
  /** Timestamp when this project was last used */
  lastUsedAt: number;
}

/**
 * Validation error for a project.
 */
export interface ProjectValidationError {
  /** Field or environment variable that has an error */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Error type for categorization */
  type: 'missing' | 'invalid' | 'connection' | 'unknown';
}

/**
 * Result of project validation.
 */
export interface ProjectValidationResult {
  /** Whether the project configuration is valid */
  valid: boolean;
  /** List of validation errors */
  errors: ProjectValidationError[];
  /** Optional additional information about the world */
  worldInfo?: {
    /** Resolved data directory info for local world */
    dataDirInfo?: WorkflowDataDirInfo;
    /** World manifest entry if known */
    world?: WorldManifestEntry;
  };
}

/**
 * Generate a unique project ID.
 */
export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new project from environment variables.
 */
export function createProject(options: {
  worldId: string;
  envMap: Record<string, string | undefined>;
  projectDir: string;
  name?: string;
}): Project {
  const { worldId, envMap, projectDir, name } = options;
  const id = generateProjectId();
  const now = Date.now();

  // Derive name from projectDir if not provided
  const projectName =
    name ||
    projectDir.split('/').filter(Boolean).slice(-2).join('/') ||
    'Untitled Project';

  return {
    id,
    name: projectName,
    worldId,
    envMap,
    projectDir,
    createdAt: now,
    lastUsedAt: now,
  };
}

/**
 * Validate a project configuration.
 *
 * This checks:
 * 1. All required environment variables for the world are set
 * 2. For known worlds, applies additional validation (local: check dataDir, vercel: check connection)
 * 3. For unknown worlds, simply checks required variables are present
 *
 * @param project - The project to validate
 * @param options - Validation options
 * @returns Validation result with errors and world info
 */
export async function validateProject(
  project: Project,
  options: {
    /** Skip connection checks (useful for client-side validation) */
    skipConnectionCheck?: boolean;
  } = {}
): Promise<ProjectValidationResult> {
  const { skipConnectionCheck = false } = options;
  const errors: ProjectValidationError[] = [];

  // Get world from manifest
  const world = getWorldById(project.worldId);

  // Check required environment variables
  if (world) {
    for (const envVar of world.requiredEnv) {
      const value = project.envMap[envVar];
      if (!value || value.trim() === '') {
        errors.push({
          field: envVar,
          message: `${envVar} is required for ${world.name} world`,
          type: 'missing',
        });
      }
    }
  }

  // World-specific validation
  let dataDirInfo: WorkflowDataDirInfo | undefined;

  if (isLocalWorld(project.worldId)) {
    // Local world: validate data directory
    const dataDir =
      project.envMap.WORKFLOW_LOCAL_DATA_DIR || project.projectDir;
    try {
      dataDirInfo = await findWorkflowDataDir(dataDir);
      if (dataDirInfo.error) {
        errors.push({
          field: 'WORKFLOW_LOCAL_DATA_DIR',
          message: dataDirInfo.error,
          type: 'invalid',
        });
      }
    } catch (error) {
      errors.push({
        field: 'WORKFLOW_LOCAL_DATA_DIR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to access data directory',
        type: 'invalid',
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
          type: 'invalid',
        });
      }
    }
  } else if (isVercelWorld(project.worldId) && !skipConnectionCheck) {
    // Vercel world: validate connection string format
    const authToken = project.envMap.WORKFLOW_VERCEL_AUTH_TOKEN;
    const projectName = project.envMap.WORKFLOW_VERCEL_PROJECT;
    const team = project.envMap.WORKFLOW_VERCEL_TEAM;

    if (!authToken) {
      errors.push({
        field: 'WORKFLOW_VERCEL_AUTH_TOKEN',
        message: 'Auth token is required for Vercel world',
        type: 'missing',
      });
    }
    if (!projectName) {
      errors.push({
        field: 'WORKFLOW_VERCEL_PROJECT',
        message: 'Project is required for Vercel world',
        type: 'missing',
      });
    }
    if (!team) {
      errors.push({
        field: 'WORKFLOW_VERCEL_TEAM',
        message: 'Team is required for Vercel world',
        type: 'missing',
      });
    }

    // TODO: Add actual connection check when not skipping
  } else if (project.worldId === 'postgres') {
    // Postgres world: validate connection URL format
    const postgresUrl = project.envMap.WORKFLOW_POSTGRES_URL;
    if (postgresUrl) {
      if (
        !postgresUrl.startsWith('postgres://') &&
        !postgresUrl.startsWith('postgresql://')
      ) {
        errors.push({
          field: 'WORKFLOW_POSTGRES_URL',
          message:
            'Invalid PostgreSQL connection string format (must start with postgres:// or postgresql://)',
          type: 'invalid',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    worldInfo: {
      dataDirInfo,
      world,
    },
  };
}

/**
 * Convert a project's envMap to the format expected by server actions.
 * Also includes the WORKFLOW_TARGET_WORLD based on worldId.
 */
export function projectToEnvMap(
  project: Project
): Record<string, string | undefined> {
  const world = getWorldById(project.worldId);

  return {
    ...project.envMap,
    WORKFLOW_TARGET_WORLD: world?.package || project.worldId,
  };
}

/**
 * Extract relevant environment variables from a full env map based on worldId.
 * Uses the manifest to determine which variables are relevant.
 */
export function filterEnvMapForWorld(
  worldId: string,
  fullEnvMap: Record<string, string | undefined>
): Record<string, string | undefined> {
  const world = getWorldById(worldId);
  if (!world) {
    // Unknown world - keep all variables
    return { ...fullEnvMap };
  }

  const relevantVars = new Set([...world.requiredEnv, ...world.optionalEnv]);
  const filtered: Record<string, string | undefined> = {};

  for (const key of relevantVars) {
    if (key in fullEnvMap) {
      filtered[key] = fullEnvMap[key];
    }
  }

  return filtered;
}
