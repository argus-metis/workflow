export { pluralize } from './pluralize.js';
export { once, type PromiseWithResolvers, withResolvers } from './promise.js';
export { parseDurationToDate } from './time.js';

// Worlds manifest
export {
  getWorldById,
  getWorldByPackage,
  getWorldEnvVars,
  isLocalWorld,
  isVercelWorld,
  worldsManifest,
  type WorldManifestEntry,
  type WorldManifestService,
  type WorldsManifest,
} from './worlds-manifest.js';

// Environment variable metadata
export {
  ENV_VAR_META,
  getEnvVarMeta,
  type EnvVarMeta,
} from './env-var-names.js';

// Project types and validation
export {
  createProject,
  filterEnvMapForWorld,
  generateProjectId,
  projectToEnvMap,
  validateProject,
  type Project,
  type ProjectValidationError,
  type ProjectValidationResult,
} from './project.js';
