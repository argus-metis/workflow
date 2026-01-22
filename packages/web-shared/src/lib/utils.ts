import type { Step } from '@workflow/world';
import type { ModelMessage } from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const durationFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;

/**
 * Formats a duration in milliseconds to a human-readable string.
 *
 * @param ms - Duration in milliseconds
 * @param compact - If true, returns a single-unit format (e.g., "45s", "2.5m").
 *                  If false (default), returns multi-part format (e.g., "1h 30m", "2d 5h").
 *
 * Compact format:
 * - < 1s: shows milliseconds (e.g., "500ms")
 * - < 1m: shows seconds (e.g., "45s")
 * - < 1h: shows minutes (e.g., "45m")
 * - >= 1h: shows hours (e.g., "2.5h")
 *
 * Full format:
 * - < 1s: shows milliseconds (e.g., "500ms")
 * - < 1m: shows seconds (e.g., "45.5s")
 * - >= 1m: shows human-readable format (e.g., "1h 30m", "2d 5h")
 */
export function formatDuration(ms: number, compact = false): string {
  if (ms === 0) {
    return '0';
  }

  // For durations less than 1 second, show milliseconds
  if (ms < MS_IN_SECOND) {
    return `${durationFormatter.format(ms)}ms`;
  }

  // For durations less than 1 minute, show seconds
  if (ms < MS_IN_MINUTE) {
    return `${durationFormatter.format(ms / MS_IN_SECOND)}s`;
  }

  // Compact format: single unit
  if (compact) {
    if (ms < MS_IN_HOUR) {
      return `${durationFormatter.format(ms / MS_IN_MINUTE)}m`;
    }
    return `${durationFormatter.format(ms / MS_IN_HOUR)}h`;
  }

  // Full format: human-readable multi-part
  const days = Math.floor(ms / MS_IN_DAY);
  const hours = Math.floor((ms % MS_IN_DAY) / MS_IN_HOUR);
  const minutes = Math.floor((ms % MS_IN_HOUR) / MS_IN_MINUTE);
  const seconds = Math.floor((ms % MS_IN_MINUTE) / MS_IN_SECOND);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (hours <= 1 && (seconds > 0 || parts.length === 0)) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

/**
 * Returns a formatted pagination display string
 * @param currentPage - The current page number
 * @param totalPages - The total number of pages visited so far
 * @param hasMore - Whether there are more pages available
 * @returns Formatted string like "Page 1 of 3+" or "Page 2 of 2"
 */
export function getPaginationDisplay(
  currentPage: number,
  totalPages: number,
  hasMore: boolean
): string {
  if (hasMore) {
    return `Page ${currentPage} of ${totalPages}+`;
  }
  return `Page ${currentPage} of ${totalPages}`;
}

// ============================================================================
// Durable Agent Utilities
// ============================================================================

/**
 * Check if a step is a doStreamStep (LLM call with conversation input)
 */
export function isDoStreamStep(stepName: string): boolean {
  return stepName.endsWith('//doStreamStep');
}

/**
 * Extract the conversation from a hydrated doStreamStep input.
 * doStreamStep signature: (conversationPrompt, model, writable, tools, options)
 * So input[0] is the conversation.
 */
export function extractConversation(stepInput: unknown): ModelMessage[] | null {
  if (!Array.isArray(stepInput) || stepInput.length === 0) {
    return null;
  }

  const firstArg = stepInput[0];

  if (!Array.isArray(firstArg)) {
    return null;
  }

  // Validate it looks like ModelMessage[]
  if (
    !firstArg.every((msg) => msg && typeof msg === 'object' && 'role' in msg)
  ) {
    return null;
  }

  return firstArg as ModelMessage[];
}

/**
 * A doStreamStep with its conversation input extracted
 */
export interface StreamStep {
  stepId: string;
  stepName: string;
  displayName: string;
  conversation: ModelMessage[];
}

/**
 * Identifies all stream steps (doStreamStep) in a run and extracts their conversations.
 */
export function identifyStreamSteps(steps: Step[]): StreamStep[] {
  return steps
    .filter((step) => isDoStreamStep(step.stepName))
    .map((step) => {
      const functionName = step.stepName.split('//').pop() ?? 'unknown';
      const conversation = extractConversation(step.input) ?? [];

      return {
        stepId: step.stepId,
        stepName: step.stepName,
        displayName: functionName,
        conversation,
      };
    });
}

// ============================================================================
// Typed Array Display Utilities (Browser-safe)
// ============================================================================

/**
 * List of typed array constructor names for detection
 */
const TYPED_ARRAY_NAMES = [
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
];

/**
 * Check if a value is a TypedArray (Uint8Array, Int32Array, etc.)
 */
export function isTypedArray(
  value: unknown
): value is
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array {
  if (!value || typeof value !== 'object') return false;
  return TYPED_ARRAY_NAMES.includes(value.constructor?.name);
}

/**
 * Marker for typed array reference objects used in display.
 */
export const TYPED_ARRAY_REF_TYPE = '__workflow_typed_array_ref__';

/**
 * A typed array reference that contains type info and a preview of the data.
 */
export interface TypedArrayRef {
  __type: typeof TYPED_ARRAY_REF_TYPE;
  arrayType: string;
  length: number;
  byteLength: number;
  preview: (number | string)[];
}

/**
 * Default configuration for typed array display
 */
export const TYPED_ARRAY_DISPLAY_CONFIG = {
  headCount: 10,
  tailCount: 5,
  showAllThreshold: 20,
};

/**
 * Convert a typed array to a TypedArrayRef for JSON serialization.
 * Shows a preview with first N and last M elements for large arrays.
 */
export function typedArrayToRef(
  arr:
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array,
  config = TYPED_ARRAY_DISPLAY_CONFIG
): TypedArrayRef {
  const { headCount, tailCount, showAllThreshold } = config;
  const arrayType = arr.constructor.name;
  const length = arr.length;
  const byteLength = arr.byteLength;

  // Helper to convert typed array elements to JSON-safe values
  const toJsonSafe = (v: unknown): number | string =>
    typeof v === 'bigint' ? v.toString() : (v as number);

  let preview: (number | string)[];

  if (length <= showAllThreshold) {
    preview = Array.from(arr as unknown as ArrayLike<unknown>, toJsonSafe);
  } else {
    const head = Array.from(
      arr.slice(0, headCount) as unknown as ArrayLike<unknown>,
      toJsonSafe
    );
    const tail = Array.from(
      arr.slice(-tailCount) as unknown as ArrayLike<unknown>,
      toJsonSafe
    );
    preview = [...head, '...', ...tail];
  }

  return {
    __type: TYPED_ARRAY_REF_TYPE,
    arrayType,
    length,
    byteLength,
    preview,
  };
}

/**
 * Create a JSON replacer function that handles typed arrays for display.
 * Browser-safe version that doesn't require Node.js dependencies.
 *
 * Usage: JSON.stringify(data, createJsonReplacer(), 2)
 */
export function createJsonReplacer(): (key: string, value: unknown) => unknown {
  return function replacer(_key: string, value: unknown): unknown {
    if (isTypedArray(value)) {
      return typedArrayToRef(value);
    }
    if (value instanceof ArrayBuffer) {
      const arr = new Uint8Array(value);
      const ref = typedArrayToRef(arr);
      return { ...ref, arrayType: 'ArrayBuffer' };
    }
    return value;
  };
}
