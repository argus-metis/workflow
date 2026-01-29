export enum FLOAT32_OPTIONS {
  NEVER = 0,
  ALWAYS = 1,
  DECIMAL_ROUND = 3,
  DECIMAL_FIT = 4,
}
export interface SizeLimitOptions {
  maxArraySize: number;
  maxMapSize: number;
  maxObjectSize: number;
}
export interface Options {
  alwaysUseFloat?: boolean;
  useFloat32?: FLOAT32_OPTIONS;
  useRecords?: boolean;
  structures?: {}[];
  structuredClone?: boolean;
  mapsAsObjects?: boolean;
  variableMapSize?: boolean;
  copyBuffers?: boolean;
  bundleStrings?: boolean;
  useTimestamp32?: boolean;
  largeBigIntToFloat?: boolean;
  encodeUndefinedAsNil?: boolean;
  maxSharedStructures?: number;
  maxOwnStructures?: number;
  useSelfDescribedHeader?: boolean;
  useToJSON?: boolean;
  keyMap?: {};
  shouldShareStructure?: (keys: string[]) => boolean;
  getStructures?(): {}[];
  saveStructures?(structures: {}[]): boolean | void;
  onInvalidDate?: () => any;
  tagUint8Array?: boolean;
  pack?: boolean;
  sequential?: boolean;
  /** Custom global scope for type construction (e.g., for VM contexts) */
  global?: Record<string, any>;
  /** Per-instance extensions that support predicate-based matching */
  extensions?: Extension<any, any>[];
}
type ClassOf<T> = new (...args: any[]) => T;
type PredicateFn<T> = (value: any) => value is T;
interface Extension<T, R> {
  /** Constructor class or predicate function to match values */
  Class: ClassOf<T> | PredicateFn<T> | ((value: any) => boolean);
  /** CBOR tag number (optional for tagless extensions) */
  tag?: number;
  /** Dynamic tag getter (called if tag is undefined) */
  getTag?(value: T): number | undefined;
  encode(
    value: T,
    encodeFn: (data: R) => Uint8Array,
    makeRoom?: (size: number) => Uint8Array
  ): Buffer | Uint8Array | void;
  decode?(item: R): T;
}
export class Decoder {
  constructor(options?: Options);
  decode(messagePack: Buffer | Uint8Array): any;
  decodeMultiple(
    messagePack: Buffer | Uint8Array,
    forEach?: (value: any) => any
  ): [] | void;
}
export function setMaxLimits(options: SizeLimitOptions): void;
export function decode(messagePack: Buffer | Uint8Array): any;
export function decodeMultiple(
  messagePack: Buffer | Uint8Array,
  forEach?: (value: any) => any
): [] | void;
export function addExtension<T, R>(extension: Extension<T, R>): void;
export function clearSource(): void;
export function roundFloat32(float32Number: number): number;
export let isNativeAccelerationEnabled: boolean;

export class Encoder extends Decoder {
  encode(value: any): Buffer;
}
export function encode(value: any): Buffer;
export function encodeAsIterable(
  value: any
): Iterable<Buffer | Blob | AsyncIterable<Buffer>>;
export function encodeAsAsyncIterable(value: any): AsyncIterable<Buffer>;

import { Transform, Readable } from 'stream';

export as namespace CBOR;
export class DecoderStream extends Transform {
  constructor(
    options?:
      | Options
      | { highWaterMark: number; emitClose: boolean; allowHalfOpen: boolean }
  );
}
export class EncoderStream extends Transform {
  constructor(
    options?:
      | Options
      | { highWaterMark: number; emitClose: boolean; allowHalfOpen: boolean }
  );
}

export class Tag {
  constructor(value: any, tagNumber: number);
  value: any;
  tag: number;
}
