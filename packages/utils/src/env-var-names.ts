/**
 * Human-readable names and descriptions for environment variables.
 * Used by the web UI to display configuration options.
 */

export interface EnvVarMeta {
  /** Human-readable label for the variable */
  label: string;
  /** Short description of what this variable does */
  description: string;
  /** Placeholder text for input fields */
  placeholder?: string;
  /** Whether this is a sensitive value (password, token, etc.) */
  sensitive?: boolean;
  /** Input type hint */
  inputType?: 'text' | 'password' | 'url' | 'number' | 'path';
}

/**
 * Metadata for all known environment variables.
 * Keyed by the environment variable name.
 */
export const ENV_VAR_META: Record<string, EnvVarMeta> = {
  // Local world
  WORKFLOW_LOCAL_DATA_DIR: {
    label: 'Data Directory',
    description:
      'Path to the workflow data directory. Leave empty to auto-detect.',
    placeholder: '/path/to/project or ./relative/path',
    inputType: 'path',
  },
  PORT: {
    label: 'Port',
    description: 'Port number for the local development server',
    placeholder: '3000',
    inputType: 'number',
  },
  WORKFLOW_MANIFEST_PATH: {
    label: 'Manifest Path',
    description:
      'Path to the workflow manifest file. Used for the Workflows graph view.',
    placeholder: 'app/.well-known/workflow/v1/manifest.json',
    inputType: 'path',
  },

  // Vercel world
  WORKFLOW_VERCEL_AUTH_TOKEN: {
    label: 'Auth Token',
    description: 'Vercel authentication token for API access',
    placeholder: 'Your Vercel auth token',
    sensitive: true,
    inputType: 'password',
  },
  WORKFLOW_VERCEL_PROJECT: {
    label: 'Project',
    description: 'Vercel project name or ID',
    placeholder: 'my-project',
    inputType: 'text',
  },
  WORKFLOW_VERCEL_TEAM: {
    label: 'Team',
    description: 'Vercel team slug or ID',
    placeholder: 'my-team',
    inputType: 'text',
  },
  WORKFLOW_VERCEL_ENV: {
    label: 'Environment',
    description: 'Vercel deployment environment to connect to',
    placeholder: 'production',
    inputType: 'text',
  },
  WORKFLOW_VERCEL_BACKEND_URL: {
    label: 'Backend URL',
    description: 'Custom Vercel API backend URL (advanced)',
    placeholder: 'https://api.vercel.com/v1/workflow',
    inputType: 'url',
  },

  // Postgres world
  WORKFLOW_POSTGRES_URL: {
    label: 'Connection URL',
    description: 'PostgreSQL connection string',
    placeholder: 'postgres://user:password@host:5432/database',
    sensitive: true,
    inputType: 'url',
  },

  // Turso world
  WORKFLOW_TURSO_DATABASE_URL: {
    label: 'Database URL',
    description: 'Turso/libSQL database URL',
    placeholder: 'libsql://your-db.turso.io',
    inputType: 'url',
  },
  WORKFLOW_TURSO_AUTH_TOKEN: {
    label: 'Auth Token',
    description: 'Turso authentication token',
    placeholder: 'Your Turso auth token',
    sensitive: true,
    inputType: 'password',
  },

  // MongoDB world
  WORKFLOW_MONGODB_URI: {
    label: 'Connection URI',
    description: 'MongoDB connection string',
    placeholder: 'mongodb://localhost:27017',
    sensitive: true,
    inputType: 'url',
  },
  WORKFLOW_MONGODB_DATABASE_NAME: {
    label: 'Database Name',
    description: 'MongoDB database name',
    placeholder: 'workflow',
    inputType: 'text',
  },

  // Redis world
  WORKFLOW_REDIS_URI: {
    label: 'Connection URI',
    description: 'Redis connection string',
    placeholder: 'redis://localhost:6379',
    inputType: 'url',
  },

  // Jazz world
  JAZZ_API_KEY: {
    label: 'API Key',
    description: 'Jazz Cloud API key',
    placeholder: 'Your Jazz API key',
    sensitive: true,
    inputType: 'password',
  },
  JAZZ_WORKER_ACCOUNT: {
    label: 'Worker Account',
    description: 'Jazz worker account ID',
    placeholder: 'Account ID',
    inputType: 'text',
  },
  JAZZ_WORKER_SECRET: {
    label: 'Worker Secret',
    description: 'Jazz worker secret key',
    placeholder: 'Worker secret',
    sensitive: true,
    inputType: 'password',
  },

  // Generic/common
  WORKFLOW_TARGET_WORLD: {
    label: 'Target World',
    description: 'The world package to use',
    placeholder: '@workflow/world-local',
    inputType: 'text',
  },
};

/**
 * Get metadata for an environment variable.
 * Returns a default entry if the variable is not known.
 */
export function getEnvVarMeta(envVar: string): EnvVarMeta {
  return (
    ENV_VAR_META[envVar] || {
      label: envVar,
      description: `Custom environment variable: ${envVar}`,
      inputType: 'text',
    }
  );
}
