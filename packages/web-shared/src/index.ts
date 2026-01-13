export {
  parseStepName,
  parseWorkflowName,
} from '@workflow/core/parse-name';
export type { Event, Hook, Step, WorkflowRun } from '@workflow/world';

export * from './api/workflow-api-client';
export type {
  EnvMap,
  ProjectValidationActionResult,
} from './api/workflow-server-actions';

// Note: Server actions (getSelfHostingMode, validateProjectConfig) are exported
// from '@workflow/web-shared/server' and should be imported directly in server components.

// Re-export Project types from utils for convenience (client-safe)
export type {
  Project,
  ProjectValidationError,
  ProjectValidationResult,
} from '@workflow/utils/project-types';

// Re-export World manifest types (client-safe)
export type {
  WorldDefinition,
  WorldsManifest,
} from '@workflow/utils/worlds-manifest';

// Export client-safe functions from project-types
export {
  generateProjectId,
  createProject,
  projectToEnvMap,
  isVercelWorld,
  getProjectCacheKey,
} from '@workflow/utils/project-types';

// Export client-safe functions from worlds-manifest
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
} from '@workflow/utils/worlds-manifest';
export { ErrorBoundary } from './error-boundary';
export type {
  HookActionCallbacks,
  HookActionsDropdownItemProps,
  HookResolveModalProps,
  UseHookActionsOptions,
  UseHookActionsReturn,
} from './hook-actions';
export {
  HookResolveModalWrapper,
  ResolveHookDropdownItem,
  ResolveHookModal,
  useHookActions,
} from './hook-actions';
export type { EventAnalysis } from './lib/event-analysis';
export {
  analyzeEvents,
  hasPendingHooksFromEvents,
  hasPendingStepsFromEvents,
  isTerminalStatus,
  shouldShowReenqueueButton,
} from './lib/event-analysis';
export type { StreamStep } from './lib/utils';
export {
  extractConversation,
  formatDuration,
  identifyStreamSteps,
  isDoStreamStep,
} from './lib/utils';
export { RunTraceView } from './run-trace-view';
export { ConversationView } from './sidebar/conversation-view';
export { StreamViewer } from './stream-viewer';
export type { Span, SpanEvent } from './trace-viewer/types';
export { WorkflowTraceViewer } from './workflow-trace-view';
