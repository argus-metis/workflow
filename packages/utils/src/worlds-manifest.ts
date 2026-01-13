/**
 * Types for the worlds manifest.
 * This manifest defines all known world packages and their configuration requirements.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface WorldManifestService {
  name: string;
  image: string;
  ports: string[];
  env?: Record<string, string>;
  healthCheck?: {
    cmd: string;
    interval: string;
    timeout: string;
    retries: number;
  };
}

export interface WorldManifestEntry {
  /** Unique identifier for the world */
  id: string;
  /** Type of world: 'official' or 'community' */
  type: 'official' | 'community';
  /** npm package name */
  package: string;
  /** Human-readable display name */
  name: string;
  /** Short description */
  description: string;
  /** Link to documentation */
  docs: string;
  /** Repository URL (for community worlds) */
  repository?: string;
  /** Default environment variables */
  env: Record<string, string>;
  /** Required environment variables that must be set */
  requiredEnv: string[];
  /** Optional environment variables that can be configured */
  optionalEnv: string[];
  /** Docker services for local development */
  services: WorldManifestService[];
  /** Setup command */
  setup?: string;
  /** Whether this world requires deployment to function */
  requiresDeployment?: boolean;
  /** Whether this world requires credentials */
  requiresCredentials?: boolean;
  /** Note about required credentials */
  credentialsNote?: string;
}

export interface WorldsManifest {
  worlds: WorldManifestEntry[];
}

/**
 * The worlds manifest embedded at build time.
 * This ensures CLI and web app releases are bound to a specific version.
 */
let _cachedManifest: WorldsManifest | null = null;

function loadManifest(): WorldsManifest {
  if (_cachedManifest) {
    return _cachedManifest;
  }

  try {
    // Get the directory of this module
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const manifestPath = join(__dirname, 'worlds-manifest.json');
    const content = readFileSync(manifestPath, 'utf-8');
    _cachedManifest = JSON.parse(content) as WorldsManifest;
    return _cachedManifest;
  } catch (error) {
    // Fallback to an empty manifest if file not found
    // This can happen during development before the file is copied
    console.warn('Could not load worlds-manifest.json:', error);
    return { worlds: [] };
  }
}

export const worldsManifest: WorldsManifest = loadManifest();

/**
 * Get a world entry by its ID
 */
export function getWorldById(id: string): WorldManifestEntry | undefined {
  return worldsManifest.worlds.find((w) => w.id === id);
}

/**
 * Get a world entry by its package name
 */
export function getWorldByPackage(
  packageName: string
): WorldManifestEntry | undefined {
  return worldsManifest.worlds.find((w) => w.package === packageName);
}

/**
 * Get all environment variables relevant for a world (required + optional)
 */
export function getWorldEnvVars(worldId: string): string[] {
  const world = getWorldById(worldId);
  if (!world) return [];
  return [...world.requiredEnv, ...world.optionalEnv];
}

/**
 * Check if a world ID corresponds to the Vercel world (multi-tenant scenario)
 */
export function isVercelWorld(worldId: string): boolean {
  return worldId === 'vercel' || worldId === '@workflow/world-vercel';
}

/**
 * Check if a world ID corresponds to the local world
 */
export function isLocalWorld(worldId: string | undefined): boolean {
  return !worldId || worldId === 'local' || worldId === '@workflow/world-local';
}
