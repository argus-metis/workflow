export { pluralize } from './pluralize.js';
export { once, type PromiseWithResolvers, withResolvers } from './promise.js';
export { parseDurationToDate } from './time.js';

// Client-safe project types and utilities (no Node.js dependencies)
export type {
  Project,
  ProjectValidationError,
  ProjectValidationResult,
} from './project-types.js';
export {
  createProject,
  generateProjectId,
  projectToEnvMap,
  isVercelWorld,
  getProjectCacheKey,
} from './project-types.js';

// NOTE: validateProject is NOT exported from this index.ts because it uses
// Node.js APIs (fs/promises, path) that are not available in browser environments.
// Import it directly from '@workflow/utils/project' in server code.

// World manifest types and utilities (client-safe)
export type {
  WorldDefinition,
  WorldsManifest,
  WorldService,
} from './worlds-manifest.js';
export {
  worldsManifest,
  getWorldById,
  getWorldByPackage,
  getWorldEnvVars,
  isKnownWorld,
  getEnvVarDisplayName,
  getEnvVarDescription,
  isEnvVarSensitive,
  ENV_VAR_DISPLAY_NAMES,
  ENV_VAR_DESCRIPTIONS,
  ENV_VAR_IS_SENSITIVE,
} from './worlds-manifest.js';
