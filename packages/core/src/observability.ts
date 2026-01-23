/**
 * Observability utilities for workflow inspection.
 * Shared between CLI and Web UI for consistent behavior.
 */

import { inspect } from 'node:util';
import { parseClassName } from './parse-name.js';
import {
  hydrateStepArguments,
  hydrateStepReturnValue,
  hydrateWorkflowArguments,
  hydrateWorkflowReturnValue,
} from './serialization.js';

const STREAM_ID_PREFIX = 'strm_';

/**
 * Marker for stream reference objects that can be rendered as links
 */
export const STREAM_REF_TYPE = '__workflow_stream_ref__';

/**
 * A stream reference object that contains the stream ID and can be
 * detected in the UI to render as a clickable link
 */
export interface StreamRef {
  __type: typeof STREAM_REF_TYPE;
  streamId: string;
}

/**
 * Marker for custom class instance references.
 * Used in observability to represent serialized class instances
 * that cannot be fully deserialized (because the class is not registered).
 */
export const CLASS_INSTANCE_REF_TYPE = '__workflow_class_instance_ref__';

/**
 * A class instance reference that contains the class name and serialized data.
 * This is used during o11y hydration when a custom class instance is encountered
 * but the class is not registered for deserialization.
 *
 * Provides a custom `util.inspect.custom` representation for nice CLI output:
 * `Point { x: 1, y: 2 } [class//path/to/file.ts//Point]`
 */
export class ClassInstanceRef {
  readonly __type = CLASS_INSTANCE_REF_TYPE;

  constructor(
    public readonly className: string,
    public readonly classId: string,
    public readonly data: unknown
  ) {}

  /**
   * Custom inspect for Node.js util.inspect (used by console.log, CLI, etc.)
   * Renders as: ClassName@filename { ...data }
   * The @filename portion is styled gray (like undefined in Node.js)
   */
  [inspect.custom](
    _depth: number,
    options: import('node:util').InspectOptionsStylized
  ): string {
    const dataStr = inspect(this.data, { ...options, depth: options.depth });
    const parsed = parseClassName(this.classId);
    const filePath = parsed?.path ?? this.classId;
    // Extract just the filename from the path
    const fileName = filePath.split('/').pop() ?? filePath;
    // Style the @filename portion gray using the 'undefined' style
    const styledFileName = options.stylize
      ? options.stylize(`@${fileName}`, 'undefined')
      : `@${fileName}`;
    return `${this.className}${styledFileName} ${dataStr}`;
  }

  /**
   * For JSON.stringify - returns a plain object representation
   */
  toJSON(): {
    __type: string;
    className: string;
    classId: string;
    data: unknown;
  } {
    return {
      __type: this.__type,
      className: this.className,
      classId: this.classId,
      data: this.data,
    };
  }
}

/**
 * Check if a value is a ClassInstanceRef object
 */
export const isClassInstanceRef = (
  value: unknown
): value is ClassInstanceRef => {
  return (
    value instanceof ClassInstanceRef ||
    (value !== null &&
      typeof value === 'object' &&
      '__type' in value &&
      value.__type === CLASS_INSTANCE_REF_TYPE &&
      'className' in value &&
      typeof value.className === 'string')
  );
};

/**
 * Check if a value is a stream ID string
 */
export const isStreamId = (value: unknown): boolean => {
  return typeof value === 'string' && value.startsWith(STREAM_ID_PREFIX);
};

/**
 * Check if a value is a StreamRef object
 */
export const isStreamRef = (value: unknown): value is StreamRef => {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__type' in value &&
    value.__type === STREAM_REF_TYPE &&
    'streamId' in value &&
    typeof value.streamId === 'string'
  );
};

/**
 * Create a StreamRef object from a stream value.
 * This is used during hydration to convert serialized streams into
 * objects that can be rendered as links in the UI.
 */
const streamToStreamRef = (value: any): StreamRef => {
  let streamId: string;
  if ('name' in value) {
    const name = String(value.name);
    if (!name.startsWith(STREAM_ID_PREFIX)) {
      streamId = `${STREAM_ID_PREFIX}${name}`;
    } else {
      streamId = name;
    }
  } else {
    streamId = `${STREAM_ID_PREFIX}null`;
  }
  return {
    __type: STREAM_REF_TYPE,
    streamId,
  };
};

const serializedStepFunctionToString = (value: unknown): string => {
  if (!value) return 'null';
  if (typeof value !== 'object') return 'null';
  if ('stepId' in value) {
    const stepId = value.stepId;
    // TODO: Add closure vars to the string representation.
    // value.closureVars
    return `<step:${stepId}>`;
  }
  return '<function>';
};

/**
 * Extract the class name from a classId.
 * The classId format is typically "path/to/file/ClassName" so we extract the last segment.
 */
const extractClassName = (classId: string): string => {
  if (!classId) return 'Unknown';
  const parts = classId.split('/');
  return parts[parts.length - 1] || classId;
};

/**
 * Convert a serialized class instance to a ClassInstanceRef for o11y display.
 * This allows viewing custom class instances in the UI without needing
 * the class to be registered for deserialization.
 */
const serializedInstanceToRef = (value: {
  classId: string;
  data: unknown;
}): ClassInstanceRef => {
  return new ClassInstanceRef(
    extractClassName(value.classId),
    value.classId,
    value.data
  );
};

/**
 * Convert a serialized class reference to a string representation.
 * This is used for Class type (the constructor reference itself, not an instance).
 */
const serializedClassToString = (value: { classId: string }): string => {
  const className = extractClassName(value.classId);
  return `<class:${className}>`;
};

/**
 * This is an extra reviver for devalue that takes any streams that would be converted,
 * into actual streams, and instead formats them as StreamRef objects for display in the UI.
 *
 * This is mainly because we don't want to open any streams that we aren't going to read from,
 * and so we can get the string ID/name, which the serializer stream doesn't provide.
 *
 * Also handles custom class instances (Instance) and class references (Class) by converting
 * them to opaque markers, since the custom classes are not registered for deserialization
 * in the o11y context.
 */
const streamPrintRevivers: Record<string, (value: any) => any> = {
  ReadableStream: streamToStreamRef,
  WritableStream: streamToStreamRef,
  TransformStream: streamToStreamRef,
  StepFunction: serializedStepFunctionToString,
  Instance: serializedInstanceToRef,
  Class: serializedClassToString,
};

const hydrateStepIO = <
  T extends { stepId?: string; input?: any; output?: any; runId?: string },
>(
  step: T
): T => {
  return {
    ...step,
    input:
      step.input && Array.isArray(step.input) && step.input.length
        ? hydrateStepArguments(
            step.input,
            [],
            step.runId as string,
            globalThis,
            streamPrintRevivers
          )
        : step.input,
    output: step.output
      ? hydrateStepReturnValue(step.output, globalThis, streamPrintRevivers)
      : step.output,
  };
};

const hydrateWorkflowIO = <
  T extends { runId?: string; input?: any; output?: any },
>(
  workflow: T
): T => {
  return {
    ...workflow,
    input:
      workflow.input && Array.isArray(workflow.input) && workflow.input.length
        ? hydrateWorkflowArguments(
            workflow.input,
            globalThis,
            streamPrintRevivers
          )
        : workflow.input,
    output: workflow.output
      ? hydrateWorkflowReturnValue(
          workflow.output,
          [],
          workflow.runId as string,
          globalThis,
          streamPrintRevivers
        )
      : workflow.output,
  };
};

const hydrateEventData = <
  T extends { eventId?: string; eventData?: any; runId?: string },
>(
  event: T
): T => {
  if (!event.eventData) {
    return event;
  }
  const eventData = { ...event.eventData };
  // Events can have various eventData with non-devalued keys.
  // So far, only eventData.result is devalued (though this may change),
  // so we need to hydrate it specifically.
  try {
    if ('result' in eventData && typeof eventData.result === 'object') {
      eventData.result = hydrateStepReturnValue(
        eventData.result,
        globalThis,
        streamPrintRevivers
      );
    }
  } catch (error) {
    console.error('Error hydrating event data', error);
  }
  return {
    ...event,
    eventData,
  };
};

const hydrateHookMetadata = <T extends { hookId?: string; metadata?: any }>(
  hook: T
): T => {
  return {
    ...hook,
    metadata:
      hook.metadata && 'runId' in hook
        ? hydrateStepArguments(
            hook.metadata,
            [],
            hook.runId as string,
            globalThis,
            streamPrintRevivers
          )
        : hook.metadata,
  };
};

export const hydrateResourceIO = <
  T extends {
    stepId?: string;
    hookId?: string;
    eventId?: string;
    input?: any;
    output?: any;
    metadata?: any;
    eventData?: any;
    executionContext?: any;
  },
>(
  resource: T
): T => {
  if (!resource) {
    return resource;
  }
  let hydrated: T;
  if ('stepId' in resource) {
    hydrated = hydrateStepIO(resource);
  } else if ('hookId' in resource) {
    hydrated = hydrateHookMetadata(resource);
  } else if ('eventId' in resource) {
    hydrated = hydrateEventData(resource);
  } else {
    hydrated = hydrateWorkflowIO(resource);
  }
  if ('executionContext' in hydrated) {
    const { executionContext: _, ...rest } = hydrated;
    return rest as T;
  }
  return hydrated;
};

/**
 * Extract all stream IDs from a value (recursively traverses objects/arrays)
 */
export function extractStreamIds(obj: unknown): string[] {
  const streamIds: string[] = [];

  function traverse(value: unknown): void {
    if (isStreamId(value)) {
      streamIds.push(value as string);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        traverse(item);
      }
    } else if (value && typeof value === 'object') {
      for (const val of Object.values(value)) {
        traverse(val);
      }
    }
  }

  traverse(obj);
  return Array.from(new Set(streamIds)); // Remove duplicates
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed
 */
export function truncateId(id: string, maxLength = 12): string {
  if (id.length <= maxLength) return id;
  return `${id.slice(0, maxLength)}...`;
}

// ============================================================================
// Typed Array Display Utilities
// ============================================================================

/**
 * Marker for typed array reference objects used in display.
 * This is used when serializing typed arrays for JSON output.
 */
export const TYPED_ARRAY_REF_TYPE = '__workflow_typed_array_ref__';

/**
 * A typed array reference that contains type info and a preview of the data.
 * Used for JSON serialization to avoid outputting huge arrays of bytes.
 */
export interface TypedArrayRef {
  __type: typeof TYPED_ARRAY_REF_TYPE;
  /** The typed array constructor name (e.g., "Uint8Array") */
  arrayType: string;
  /** The length of the array in elements */
  length: number;
  /** The byte length of the array */
  byteLength: number;
  /** A preview of the first few and last few elements */
  preview: (number | string)[];
}

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
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

/**
 * Check if a value is a TypedArrayRef object
 */
export function isTypedArrayRef(value: unknown): value is TypedArrayRef {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__type' in value &&
    value.__type === TYPED_ARRAY_REF_TYPE &&
    'arrayType' in value &&
    typeof value.arrayType === 'string'
  );
}

/**
 * Check if a value is an ArrayBuffer
 */
export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

/**
 * Default configuration for typed array display
 */
export const TYPED_ARRAY_DISPLAY_CONFIG = {
  /** Number of elements to show at the start */
  headCount: 10,
  /** Number of elements to show at the end */
  tailCount: 5,
  /** Threshold below which we show all elements */
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

  let preview: (number | string)[];

  // Helper to convert typed array elements to JSON-safe values
  const toJsonSafe = (v: unknown): number | string =>
    typeof v === 'bigint' ? v.toString() : (v as number);

  if (length <= showAllThreshold) {
    // Show all elements for small arrays
    // Convert BigInt values to strings for JSON compatibility
    preview = Array.from(arr as unknown as ArrayLike<unknown>, toJsonSafe);
  } else {
    // Show first N, ellipsis, last M
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
 * Convert an ArrayBuffer to a TypedArrayRef for JSON serialization.
 */
export function arrayBufferToRef(buffer: ArrayBuffer): TypedArrayRef {
  // Wrap in Uint8Array to get a preview of the bytes
  const arr = new Uint8Array(buffer);
  const ref = typedArrayToRef(arr);
  // Override the type to show it's an ArrayBuffer
  return {
    ...ref,
    arrayType: 'ArrayBuffer',
  };
}

/**
 * Format a typed array for display as a string.
 * Example: "Uint8Array(1024) [0, 1, 2, ..., 1021, 1022, 1023]"
 */
export function formatTypedArrayAsString(
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
): string {
  const ref = typedArrayToRef(arr, config);
  return `${ref.arrayType}(${ref.length}) [${ref.preview.join(', ')}]`;
}

/**
 * Create a JSON replacer function that handles typed arrays and other
 * special workflow types for serialization.
 *
 * Usage: JSON.stringify(data, createJsonReplacer(), 2)
 */
export function createJsonReplacer(): (key: string, value: unknown) => unknown {
  return function replacer(_key: string, value: unknown): unknown {
    // Handle typed arrays
    if (isTypedArray(value)) {
      return typedArrayToRef(value);
    }

    // Handle ArrayBuffer
    if (isArrayBuffer(value)) {
      return arrayBufferToRef(value);
    }

    return value;
  };
}
