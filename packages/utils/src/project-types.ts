/**
 * Project configuration types and client-safe utilities.
 *
 * This module contains types and functions that are safe to use in browser
 * environments. For server-only validation functions, use './project.js'.
 */

import {
  getWorldById,
  type WorldDefinition,
} from './worlds-manifest.js';

/**
 * A Project configuration for connecting to a World backend.
 */
export interface Project {
  /** Unique identifier for this project (auto-generated) */
  id: string;
  /** Human-readable name for the project (user-defined or auto-generated) */
  name: string;
  /** The world ID (e.g., 'local', 'vercel', 'postgres') or custom package name */
  worldId: string;
  /** Map of environment variables for this project */
  envMap: Record<string, string | undefined>;
  /**
   * Path to the project source directory (where UI was called from).
   * This is independent of backend and always populated.
   * Useful for associating projects with source folders.
   */
  projectDir: string;
  /** When the project was created */
  createdAt: string;
  /** When the project was last used */
  lastUsedAt: string;
}

/**
 * A validation error for a project configuration
 */
export interface ProjectValidationError {
  /** The field that has an error (env var name or 'general') */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Whether this is a critical error (project won't work) */
  critical: boolean;
}

/**
 * Result of project validation
 */
export interface ProjectValidationResult {
  /** Whether the project is valid */
  valid: boolean;
  /** List of validation errors */
  errors: ProjectValidationError[];
  /** The world definition if found */
  world?: WorldDefinition;
}

/**
 * Generate a unique project ID
 */
export function generateProjectId(): string {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new project with defaults
 */
export function createProject(
  worldId: string,
  projectDir: string,
  envMap: Record<string, string | undefined> = {},
  name?: string
): Project {
  const world = getWorldById(worldId);
  const defaultName =
    name || (world ? `${world.name} Project` : `Project (${worldId})`);

  return {
    id: generateProjectId(),
    name: defaultName,
    worldId,
    envMap,
    projectDir,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };
}

/**
 * Convert a project to an EnvMap for server actions.
 * This includes the WORKFLOW_TARGET_WORLD if needed.
 */
export function projectToEnvMap(
  project: Project
): Record<string, string | undefined> {
  const envMap = { ...project.envMap };

  // For known worlds, set WORKFLOW_TARGET_WORLD to the package name
  const world = getWorldById(project.worldId);
  if (world) {
    envMap.WORKFLOW_TARGET_WORLD = world.package;
  } else if (!envMap.WORKFLOW_TARGET_WORLD) {
    // For custom worlds, use worldId as the target world if not set
    envMap.WORKFLOW_TARGET_WORLD = project.worldId;
  }

  return envMap;
}

/**
 * Check if a world ID represents the Vercel backend.
 * Used for determining caching behavior.
 */
export function isVercelWorld(worldId: string): boolean {
  return worldId === 'vercel' || worldId === '@workflow/world-vercel';
}

/**
 * Get a stable cache key for a project's environment configuration.
 * Used by web-shared for caching World instances.
 */
export function getProjectCacheKey(project: Project): string {
  const world = getWorldById(project.worldId);
  if (!world) {
    // For unknown worlds, use all env vars
    const sortedEntries = Object.entries(project.envMap)
      .filter(([_, v]) => v !== undefined && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify({
      worldId: project.worldId,
      env: Object.fromEntries(sortedEntries),
    });
  }

  // For known worlds, only use relevant env vars (required + optional)
  const relevantVars = [...world.requiredEnv, ...world.optionalEnv];
  const relevantEnv: Record<string, string> = {};
  for (const key of relevantVars) {
    if (project.envMap[key]) {
      relevantEnv[key] = project.envMap[key]!;
    }
  }

  return JSON.stringify({ worldId: project.worldId, env: relevantEnv });
}
