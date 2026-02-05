import type {
  CreateEventParams,
  CreateEventRequest,
  Event,
  EventResult,
  ListEventsByCorrelationIdParams,
  ListEventsParams,
  RunCreatedEventRequest,
} from './events.js';
import type { GetHookParams, Hook, ListHooksParams } from './hooks.js';
import type { Queue } from './queue.js';
import type {
  GetWorkflowRunParams,
  ListWorkflowRunsParams,
  WorkflowRun,
  WorkflowRunWithoutData,
} from './runs.js';
import type { PaginatedResponse } from './shared.js';
import type {
  GetStepParams,
  ListWorkflowRunStepsParams,
  Step,
  StepWithoutData,
} from './steps.js';

/**
 * Context for encryption/decryption operations.
 * The runId is used as part of key derivation to ensure per-run isolation.
 */
export interface EncryptionContext {
  runId: string;
}

/**
 * Key material returned by getKeyMaterial for external decryption (e.g., o11y tooling).
 */
export interface KeyMaterial {
  /** Base key for derivation (raw bytes) */
  key: Uint8Array;
  /**
   * Additional context for key derivation (combined with runId).
   * For world-vercel: { projectId: string }
   */
  derivationContext: Record<string, string>;
  /** Encryption algorithm */
  algorithm: 'AES-256-GCM';
  /** Key derivation function */
  kdf: 'HKDF-SHA256';
}

/**
 * Optional encryption interface for World implementations.
 * When implemented, the serialization layer will automatically
 * encrypt data before storage and decrypt on retrieval.
 */
export interface Encryptor {
  /**
   * Encrypt serialized data for storage.
   * @param data - Serialized data (has format prefix like "devl")
   * @param context - Context containing runId for key derivation
   * @returns Encrypted data with "encr" format prefix
   */
  encrypt?(data: Uint8Array, context: EncryptionContext): Promise<Uint8Array>;

  /**
   * Decrypt data from storage.
   * @param data - Encrypted data (has "encr" format prefix)
   * @param context - Context containing runId for key derivation
   * @returns Decrypted data with original format prefix
   */
  decrypt?(data: Uint8Array, context: EncryptionContext): Promise<Uint8Array>;

  /**
   * Get key material for external decryption (e.g., o11y tooling).
   * @param options - Implementation-specific options
   *   - world-vercel: { deploymentId: string }
   *   - Other implementations may require different options
   * @returns Key material for deriving per-run keys, or null if unavailable
   */
  getKeyMaterial?(
    options: Record<string, unknown>
  ): Promise<KeyMaterial | null>;
}

export interface Streamer {
  writeToStream(
    name: string,
    runId: string | Promise<string>,
    chunk: string | Uint8Array
  ): Promise<void>;

  /**
   * Write multiple chunks to a stream in a single operation.
   * This is an optional optimization for world implementations that can
   * batch multiple writes efficiently (e.g., single HTTP request for world-vercel).
   *
   * If not implemented, the caller should fall back to sequential writeToStream() calls.
   *
   * @param name - The stream name
   * @param runId - The run ID (can be a promise)
   * @param chunks - Array of chunks to write, in order
   */
  writeToStreamMulti?(
    name: string,
    runId: string | Promise<string>,
    chunks: (string | Uint8Array)[]
  ): Promise<void>;

  closeStream(name: string, runId: string | Promise<string>): Promise<void>;
  readFromStream(
    name: string,
    startIndex?: number
  ): Promise<ReadableStream<Uint8Array>>;
  listStreamsByRunId(runId: string): Promise<string[]>;
}

/**
 * Storage interface for workflow data.
 *
 * Workflow storage models an append-only event log, so all state changes are handled through `events.create()`.
 * Run/Step/Hook entities provide materialized views into the current state, but entities can't be modified directly.
 *
 * User-originated state changes are also handled via events:
 * - run_cancelled event for run cancellation
 * - hook_disposed event for explicit hook disposal (optional)
 *
 * Note: Hooks are automatically disposed by the World implementation when a workflow
 * reaches a terminal state (run_completed, run_failed, run_cancelled). This releases
 * hook tokens for reuse by future workflows. The hook_disposed event is only needed
 * for explicit disposal before workflow completion.
 */
export interface Storage {
  runs: {
    get(
      id: string,
      params: GetWorkflowRunParams & { resolveData: 'none' }
    ): Promise<WorkflowRunWithoutData>;
    get(
      id: string,
      params?: GetWorkflowRunParams & { resolveData?: 'all' }
    ): Promise<WorkflowRun>;
    get(
      id: string,
      params?: GetWorkflowRunParams
    ): Promise<WorkflowRun | WorkflowRunWithoutData>;

    list(
      params: ListWorkflowRunsParams & { resolveData: 'none' }
    ): Promise<PaginatedResponse<WorkflowRunWithoutData>>;
    list(
      params?: ListWorkflowRunsParams & { resolveData?: 'all' }
    ): Promise<PaginatedResponse<WorkflowRun>>;
    list(
      params?: ListWorkflowRunsParams
    ): Promise<PaginatedResponse<WorkflowRun | WorkflowRunWithoutData>>;
  };

  steps: {
    get(
      runId: string | undefined,
      stepId: string,
      params: GetStepParams & { resolveData: 'none' }
    ): Promise<StepWithoutData>;
    get(
      runId: string | undefined,
      stepId: string,
      params?: GetStepParams & { resolveData?: 'all' }
    ): Promise<Step>;
    get(
      runId: string | undefined,
      stepId: string,
      params?: GetStepParams
    ): Promise<Step | StepWithoutData>;

    list(
      params: ListWorkflowRunStepsParams & { resolveData: 'none' }
    ): Promise<PaginatedResponse<StepWithoutData>>;
    list(
      params: ListWorkflowRunStepsParams & { resolveData?: 'all' }
    ): Promise<PaginatedResponse<Step>>;
    list(
      params: ListWorkflowRunStepsParams
    ): Promise<PaginatedResponse<Step | StepWithoutData>>;
  };

  events: {
    /**
     * Create a run_created event to start a new workflow run.
     * The runId can be provided by the client (required for E2E encryption) or
     * null to have the server generate it.
     *
     * @param runId - Client-provided runId, or null to have server generate it
     * @param data - The run_created event data
     * @param params - Optional parameters for event creation
     * @returns Promise resolving to the created event and run entity
     */
    create(
      runId: string | null,
      data: RunCreatedEventRequest,
      params?: CreateEventParams
    ): Promise<EventResult>;

    /**
     * Create an event for an existing workflow run and atomically update the entity.
     * Returns both the event and the affected entity (run/step/hook).
     *
     * @param runId - The workflow run ID (required for all events except run_created)
     * @param data - The event to create
     * @param params - Optional parameters for event creation
     * @returns Promise resolving to the created event and affected entity
     */
    create(
      runId: string,
      data: CreateEventRequest,
      params?: CreateEventParams
    ): Promise<EventResult>;

    list(params: ListEventsParams): Promise<PaginatedResponse<Event>>;
    listByCorrelationId(
      params: ListEventsByCorrelationIdParams
    ): Promise<PaginatedResponse<Event>>;
  };

  hooks: {
    get(hookId: string, params?: GetHookParams): Promise<Hook>;
    getByToken(token: string, params?: GetHookParams): Promise<Hook>;
    list(params: ListHooksParams): Promise<PaginatedResponse<Hook>>;
  };
}

/**
 * The "World" interface represents how Workflows are able to communicate with the outside world.
 */
export interface World extends Queue, Storage, Streamer, Encryptor {
  /**
   * A function that will be called to start any background tasks needed by the World implementation.
   * For example, in the case of a queue backed World, this would start the queue processing.
   */
  start?(): Promise<void>;
}
