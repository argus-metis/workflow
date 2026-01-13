/**
 * World manifest types and utilities.
 *
 * The manifest data is inlined here to ensure compatibility with both
 * Node.js and browser environments. The build script copies the manifest
 * from the repo root during build, and this module provides the type-safe
 * access to the manifest data.
 */

/**
 * Service configuration for a world (e.g., Docker containers)
 */
export interface WorldService {
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

/**
 * Definition of a world from the manifest
 */
export interface WorldDefinition {
  /** Unique identifier for the world (e.g., 'local', 'vercel', 'postgres') */
  id: string;
  /** Type of world: 'official' or 'community' */
  type: 'official' | 'community';
  /** npm package name for the world */
  package: string;
  /** Human-readable display name */
  name: string;
  /** Short description of the world */
  description: string;
  /** Documentation URL */
  docs: string;
  /** Default environment variables for the world */
  env: Record<string, string>;
  /** Docker services required by the world */
  services: WorldService[];
  /** Setup script path (if any) */
  setup?: string;
  /** Whether this world requires deployment to function */
  requiresDeployment?: boolean;
  /** Whether this world requires additional credentials */
  requiresCredentials?: boolean;
  /** Note about required credentials */
  credentialsNote?: string;
  /** Repository URL (for community worlds) */
  repository?: string;
  /** Environment variables required for the world to function */
  requiredEnv: string[];
  /** Optional environment variables for additional configuration */
  optionalEnv: string[];
}

/**
 * The worlds manifest structure
 */
export interface WorldsManifest {
  worlds: WorldDefinition[];
}

/**
 * Human-readable names for environment variables.
 * Used in the UI configuration panel.
 */
export const ENV_VAR_DISPLAY_NAMES: Record<string, string> = {
  // Local world
  WORKFLOW_LOCAL_DATA_DIR: 'Data Directory',
  PORT: 'Port',
  WORKFLOW_MANIFEST_PATH: 'Manifest Path',

  // Vercel world
  WORKFLOW_VERCEL_AUTH_TOKEN: 'Auth Token',
  WORKFLOW_VERCEL_PROJECT: 'Project',
  WORKFLOW_VERCEL_TEAM: 'Team',
  WORKFLOW_VERCEL_ENV: 'Environment',
  WORKFLOW_VERCEL_BACKEND_URL: 'Backend URL',

  // Postgres world
  WORKFLOW_POSTGRES_URL: 'Connection URL',

  // Turso world
  WORKFLOW_TURSO_DATABASE_URL: 'Database URL',
  WORKFLOW_TURSO_AUTH_TOKEN: 'Auth Token',

  // MongoDB world
  WORKFLOW_MONGODB_URI: 'Connection URI',
  WORKFLOW_MONGODB_DATABASE_NAME: 'Database Name',

  // Redis world
  WORKFLOW_REDIS_URI: 'Connection URI',

  // Jazz world
  JAZZ_API_KEY: 'API Key',
  JAZZ_WORKER_ACCOUNT: 'Worker Account',
  JAZZ_WORKER_SECRET: 'Worker Secret',

  // Common
  WORKFLOW_TARGET_WORLD: 'Target World',
};

/**
 * Human-readable descriptions for environment variables.
 * Used in the UI configuration panel for help text.
 */
export const ENV_VAR_DESCRIPTIONS: Record<string, string> = {
  // Local world
  WORKFLOW_LOCAL_DATA_DIR:
    'Path to your project or its workflow data directory. Relative paths allowed.',
  PORT: 'Port number for the local server',
  WORKFLOW_MANIFEST_PATH:
    'Path to the workflow manifest file. Leave empty to use default locations.',

  // Vercel world
  WORKFLOW_VERCEL_AUTH_TOKEN:
    'Vercel authentication token. If not provided, uses token from `vc login`.',
  WORKFLOW_VERCEL_PROJECT: 'Vercel project ID or name',
  WORKFLOW_VERCEL_TEAM: 'Vercel team ID or slug',
  WORKFLOW_VERCEL_ENV: 'Vercel environment (production or preview)',
  WORKFLOW_VERCEL_BACKEND_URL:
    'Custom Vercel backend URL (advanced, usually not needed)',

  // Postgres world
  WORKFLOW_POSTGRES_URL:
    'PostgreSQL connection string (e.g., postgres://user:pass@host:5432/db)',

  // Turso world
  WORKFLOW_TURSO_DATABASE_URL:
    'Turso database URL (e.g., libsql://your-db.turso.io or file:workflow.db)',
  WORKFLOW_TURSO_AUTH_TOKEN:
    'Turso auth token for remote databases (not needed for local file)',

  // MongoDB world
  WORKFLOW_MONGODB_URI: 'MongoDB connection URI (e.g., mongodb://localhost:27017)',
  WORKFLOW_MONGODB_DATABASE_NAME: 'MongoDB database name to use',

  // Redis world
  WORKFLOW_REDIS_URI: 'Redis connection URI (e.g., redis://localhost:6379)',

  // Jazz world
  JAZZ_API_KEY: 'Jazz Cloud API key',
  JAZZ_WORKER_ACCOUNT: 'Jazz worker account ID',
  JAZZ_WORKER_SECRET: 'Jazz worker secret key',

  // Common
  WORKFLOW_TARGET_WORLD: 'The npm package name of the world to use',
};

/**
 * Whether an environment variable should be treated as sensitive (masked in UI)
 */
export const ENV_VAR_IS_SENSITIVE: Record<string, boolean> = {
  WORKFLOW_VERCEL_AUTH_TOKEN: true,
  WORKFLOW_POSTGRES_URL: true, // Contains password
  WORKFLOW_TURSO_AUTH_TOKEN: true,
  JAZZ_API_KEY: true,
  JAZZ_WORKER_SECRET: true,
};

/**
 * The loaded worlds manifest - inlined for browser compatibility.
 * This data is kept in sync with worlds-manifest.json via the build process.
 */
export const worldsManifest: WorldsManifest = {
  worlds: [
    {
      id: 'local',
      type: 'official',
      package: '@workflow/world-local',
      name: 'Local',
      description: 'Filesystem-based world for local development and testing',
      docs: '/docs/deploying/world/local-world',
      env: {},
      services: [],
      requiredEnv: [],
      optionalEnv: ['WORKFLOW_LOCAL_DATA_DIR', 'PORT', 'WORKFLOW_MANIFEST_PATH'],
    },
    {
      id: 'postgres',
      type: 'official',
      package: '@workflow/world-postgres',
      name: 'Postgres',
      description: 'PostgreSQL-based world for multi-host deployments',
      docs: '/docs/deploying/world/postgres-world',
      env: {
        WORKFLOW_TARGET_WORLD: '@workflow/world-postgres',
        WORKFLOW_POSTGRES_URL: 'postgres://world:world@localhost:5432/world',
      },
      services: [
        {
          name: 'postgres',
          image: 'postgres:18-alpine',
          ports: ['5432:5432'],
          env: {
            POSTGRES_USER: 'world',
            POSTGRES_PASSWORD: 'world',
            POSTGRES_DB: 'world',
          },
          healthCheck: {
            cmd: 'pg_isready',
            interval: '10s',
            timeout: '5s',
            retries: 5,
          },
        },
      ],
      setup: './packages/world-postgres/bin/setup.js',
      requiredEnv: ['WORKFLOW_POSTGRES_URL'],
      optionalEnv: ['PORT'],
    },
    {
      id: 'vercel',
      type: 'official',
      package: '@workflow/world-vercel',
      name: 'Vercel',
      description: 'Production-ready world for Vercel platform deployments',
      docs: '/docs/deploying/world/vercel-world',
      env: {
        WORKFLOW_VERCEL_ENV: 'production',
      },
      services: [],
      requiresDeployment: true,
      requiredEnv: [
        'WORKFLOW_VERCEL_AUTH_TOKEN',
        'WORKFLOW_VERCEL_PROJECT',
        'WORKFLOW_VERCEL_TEAM',
      ],
      optionalEnv: ['WORKFLOW_VERCEL_ENV', 'WORKFLOW_VERCEL_BACKEND_URL'],
    },
    {
      id: 'starter',
      type: 'community',
      package: '@workflow-worlds/starter',
      name: 'Starter',
      description: 'Starter template for building Workflow DevKit Worlds',
      repository: 'https://github.com/mizzle-dev/workflow-worlds',
      docs: 'https://github.com/mizzle-dev/workflow-worlds/tree/main/packages/starter',
      env: {
        WORKFLOW_TARGET_WORLD: '@workflow-worlds/starter',
      },
      services: [],
      requiredEnv: [],
      optionalEnv: [],
    },
    {
      id: 'turso',
      type: 'community',
      package: '@workflow-worlds/turso',
      name: 'Turso',
      description: 'Turso/libSQL World for embedded or remote SQLite databases',
      repository: 'https://github.com/mizzle-dev/workflow-worlds',
      docs: 'https://github.com/mizzle-dev/workflow-worlds/tree/main/packages/turso',
      env: {
        WORKFLOW_TARGET_WORLD: '@workflow-worlds/turso',
        WORKFLOW_TURSO_DATABASE_URL: 'file:workflow.db',
      },
      services: [],
      setup: 'pnpm exec workflow-turso-setup',
      requiredEnv: ['WORKFLOW_TURSO_DATABASE_URL'],
      optionalEnv: ['WORKFLOW_TURSO_AUTH_TOKEN'],
    },
    {
      id: 'mongodb',
      type: 'community',
      package: '@workflow-worlds/mongodb',
      name: 'MongoDB',
      description: 'MongoDB World using native driver',
      repository: 'https://github.com/mizzle-dev/workflow-worlds',
      docs: 'https://github.com/mizzle-dev/workflow-worlds/tree/main/packages/mongodb',
      env: {
        WORKFLOW_TARGET_WORLD: '@workflow-worlds/mongodb',
        WORKFLOW_MONGODB_URI: 'mongodb://localhost:27017',
        WORKFLOW_MONGODB_DATABASE_NAME: 'workflow',
      },
      services: [
        {
          name: 'mongodb',
          image: 'mongo:7',
          ports: ['27017:27017'],
          healthCheck: {
            cmd: "mongosh --eval 'db.runCommand({ ping: 1 })'",
            interval: '10s',
            timeout: '5s',
            retries: 5,
          },
        },
      ],
      requiredEnv: ['WORKFLOW_MONGODB_URI', 'WORKFLOW_MONGODB_DATABASE_NAME'],
      optionalEnv: [],
    },
    {
      id: 'redis',
      type: 'community',
      package: '@workflow-worlds/redis',
      name: 'Redis',
      description: 'Redis World using BullMQ for queues, Redis Streams for output',
      repository: 'https://github.com/mizzle-dev/workflow-worlds',
      docs: 'https://github.com/mizzle-dev/workflow-worlds/tree/main/packages/redis',
      env: {
        WORKFLOW_TARGET_WORLD: '@workflow-worlds/redis',
        WORKFLOW_REDIS_URI: 'redis://localhost:6379',
      },
      services: [
        {
          name: 'redis',
          image: 'redis:7-alpine',
          ports: ['6379:6379'],
          healthCheck: {
            cmd: 'redis-cli ping',
            interval: '10s',
            timeout: '5s',
            retries: 5,
          },
        },
      ],
      requiredEnv: ['WORKFLOW_REDIS_URI'],
      optionalEnv: [],
    },
    {
      id: 'jazz',
      type: 'community',
      package: 'workflow-world-jazz',
      name: 'Jazz',
      description:
        'Jazz Cloud world for local-first sync and real-time collaboration',
      repository: 'https://github.com/garden-co/workflow-world-jazz',
      docs: 'https://github.com/garden-co/workflow-world-jazz',
      env: {
        WORKFLOW_TARGET_WORLD: 'workflow-world-jazz',
      },
      services: [],
      requiresCredentials: true,
      credentialsNote:
        'Requires JAZZ_API_KEY, JAZZ_WORKER_ACCOUNT, and JAZZ_WORKER_SECRET from Jazz Cloud',
      requiredEnv: ['JAZZ_API_KEY', 'JAZZ_WORKER_ACCOUNT', 'JAZZ_WORKER_SECRET'],
      optionalEnv: [],
    },
  ],
};

/**
 * Get a world definition by ID
 */
export function getWorldById(id: string): WorldDefinition | undefined {
  return worldsManifest.worlds.find((w) => w.id === id);
}

/**
 * Get a world definition by package name
 */
export function getWorldByPackage(
  packageName: string
): WorldDefinition | undefined {
  return worldsManifest.worlds.find((w) => w.package === packageName);
}

/**
 * Get all relevant environment variables for a world (required + optional)
 */
export function getWorldEnvVars(worldId: string): string[] {
  const world = getWorldById(worldId);
  if (!world) return [];
  return [...world.requiredEnv, ...world.optionalEnv];
}

/**
 * Check if a world ID is known (exists in manifest)
 */
export function isKnownWorld(worldId: string): boolean {
  return worldsManifest.worlds.some((w) => w.id === worldId);
}

/**
 * Get the display name for an environment variable
 */
export function getEnvVarDisplayName(envVar: string): string {
  return ENV_VAR_DISPLAY_NAMES[envVar] || envVar;
}

/**
 * Get the description for an environment variable
 */
export function getEnvVarDescription(envVar: string): string | undefined {
  return ENV_VAR_DESCRIPTIONS[envVar];
}

/**
 * Check if an environment variable is sensitive
 */
export function isEnvVarSensitive(envVar: string): boolean {
  return ENV_VAR_IS_SENSITIVE[envVar] || false;
}
