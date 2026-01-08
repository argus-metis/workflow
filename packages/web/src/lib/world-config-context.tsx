'use client';

import type {
  ConfigMode,
  ServerConfigResult,
  ServerWorldConfig,
} from '@workflow/web-shared/api/server-config';
import type { EnvMap } from '@workflow/web-shared/server';
import { useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getServerConfig, validateDataDir } from './server-actions';

/**
 * Source of a configuration value
 */
export type ConfigSource = 'env' | 'user' | 'default';

/**
 * A configuration field with value and source tracking
 */
export interface TrackedConfigField<T = string> {
  value: T | undefined;
  source: ConfigSource;
  /** Whether this field can be edited by the user (false if from env) */
  editable: boolean;
}

/**
 * User-editable configuration stored in localStorage
 */
export interface UserWorldConfig {
  backend?: string;
  vercelEnv?: string;
  vercelAuthToken?: string;
  vercelProject?: string;
  vercelTeam?: string;
  port?: string;
  dataDir?: string;
  manifestPath?: string;
  postgresUrl?: string;
}

/**
 * Effective configuration with source tracking for each field
 */
export interface EffectiveWorldConfig {
  backend: TrackedConfigField<string>;
  vercelEnv: TrackedConfigField<string>;
  vercelAuthToken: TrackedConfigField<string>;
  vercelProject: TrackedConfigField<string>;
  vercelTeam: TrackedConfigField<string>;
  port: TrackedConfigField<string>;
  dataDir: TrackedConfigField<string>;
  manifestPath: TrackedConfigField<string>;
  postgresUrl: TrackedConfigField<string>;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<UserWorldConfig> = {
  backend: 'local',
  vercelEnv: 'production',
  vercelAuthToken: '',
  vercelProject: '',
  vercelTeam: '',
  port: '3000',
  dataDir: './',
  manifestPath: '',
  postgresUrl: '',
};

/**
 * LocalStorage key for user configuration
 */
const STORAGE_KEY = 'workflow-world-config';

/**
 * Query parameter mapping to config fields
 */
const QUERY_PARAM_MAP: Record<string, keyof UserWorldConfig> = {
  backend: 'backend',
  env: 'vercelEnv',
  authToken: 'vercelAuthToken',
  project: 'vercelProject',
  team: 'vercelTeam',
  port: 'port',
  dataDir: 'dataDir',
  manifestPath: 'manifestPath',
  postgresUrl: 'postgresUrl',
};

/**
 * Context value type
 */
export interface WorldConfigContextValue {
  /** Current operating mode */
  mode: ConfigMode;
  /** Whether server config is still loading */
  isLoading: boolean;
  /** Raw server configuration (read-only) */
  serverConfig: ServerWorldConfig | null;
  /** User configuration from localStorage */
  userConfig: UserWorldConfig;
  /** Merged effective configuration with source tracking */
  effectiveConfig: EffectiveWorldConfig;
  /** Update user configuration (only works for non-env fields) */
  updateUserConfig: (updates: Partial<UserWorldConfig>) => void;
  /** Reset user configuration to defaults */
  resetUserConfig: () => void;
  /** Convert effective config to EnvMap for API calls */
  toEnvMap: () => EnvMap;
  /** Data directory info if available */
  dataDirInfo: ServerConfigResult['dataDirInfo'];
  /** The server's current working directory */
  serverCwd: string;
  /** Validate a data directory path */
  validateDataDirectory: typeof validateDataDir;
}

const WorldConfigContext = createContext<WorldConfigContextValue | null>(null);

/**
 * Load user config from localStorage
 */
function loadUserConfig(): UserWorldConfig {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load config from localStorage:', error);
  }
  return {};
}

/**
 * Save user config to localStorage
 */
function saveUserConfig(config: UserWorldConfig): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save config to localStorage:', error);
  }
}

/**
 * Parse config from URL search params
 */
function parseConfigFromSearchParams(
  searchParams: URLSearchParams
): UserWorldConfig {
  const config: UserWorldConfig = {};

  for (const [param, field] of Object.entries(QUERY_PARAM_MAP)) {
    const value = searchParams.get(param);
    if (value !== null && value !== '') {
      config[field] = value;
    }
  }

  return config;
}

/**
 * Check if search params contain any config values
 */
function hasConfigInSearchParams(searchParams: URLSearchParams): boolean {
  for (const param of Object.keys(QUERY_PARAM_MAP)) {
    if (searchParams.has(param) && searchParams.get(param) !== '') {
      return true;
    }
  }
  return false;
}

/**
 * Build the effective config by merging server, user, and defaults
 * Priority: server env > user config > defaults
 */
function buildEffectiveConfig(
  serverConfig: ServerWorldConfig | null,
  userConfig: UserWorldConfig
): EffectiveWorldConfig {
  const fields: (keyof UserWorldConfig)[] = [
    'backend',
    'vercelEnv',
    'vercelAuthToken',
    'vercelProject',
    'vercelTeam',
    'port',
    'dataDir',
    'manifestPath',
    'postgresUrl',
  ];

  const effective: Partial<EffectiveWorldConfig> = {};

  for (const field of fields) {
    const serverField = serverConfig?.[field as keyof ServerWorldConfig];
    const isFromEnv = serverField?.isFromEnv ?? false;
    const serverValue = serverField?.value;
    const userValue = userConfig[field];
    const defaultValue = DEFAULT_CONFIG[field];

    // Priority: env > user > default
    let value: string | undefined;
    let source: ConfigSource;

    if (isFromEnv && serverValue) {
      value = serverValue;
      source = 'env';
    } else if (userValue !== undefined && userValue !== '') {
      value = userValue;
      source = 'user';
    } else {
      value = defaultValue || undefined;
      source = 'default';
    }

    effective[field] = {
      value,
      source,
      editable: !isFromEnv,
    };
  }

  return effective as EffectiveWorldConfig;
}

/**
 * Provider component for world configuration
 */
export function WorldConfigProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [serverConfig, setServerConfig] = useState<ServerConfigResult | null>(
    null
  );
  const [userConfig, setUserConfig] = useState<UserWorldConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasProcessedQueryParams, setHasProcessedQueryParams] = useState(false);

  // Load server config on mount
  useEffect(() => {
    getServerConfig()
      .then((result) => {
        setServerConfig(result);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load server config:', error);
        setIsLoading(false);
      });
  }, []);

  // Load user config from localStorage on mount
  useEffect(() => {
    const stored = loadUserConfig();
    setUserConfig(stored);
  }, []);

  // Process query params → localStorage flow (only once)
  useEffect(() => {
    if (hasProcessedQueryParams || isLoading) return;

    const hasConfigParams = hasConfigInSearchParams(searchParams);
    if (hasConfigParams) {
      const configFromParams = parseConfigFromSearchParams(searchParams);

      // Merge with existing user config (query params take precedence)
      const merged = { ...userConfig, ...configFromParams };

      // Filter out values that are from server env (can't be overridden)
      const filtered = { ...merged };
      if (serverConfig?.config) {
        for (const [key, field] of Object.entries(serverConfig.config)) {
          if (field.isFromEnv) {
            delete filtered[key as keyof UserWorldConfig];
          }
        }
      }

      // Save to localStorage
      saveUserConfig(filtered);
      setUserConfig(filtered);

      // Clear query params from URL (but preserve non-config params like resource, id, etc.)
      const newParams = new URLSearchParams(searchParams.toString());
      for (const param of Object.keys(QUERY_PARAM_MAP)) {
        newParams.delete(param);
      }

      // Replace URL without config params
      const newUrl =
        newParams.toString() !== ''
          ? `${window.location.pathname}?${newParams.toString()}`
          : window.location.pathname;

      window.history.replaceState({}, '', newUrl);
    }

    setHasProcessedQueryParams(true);
  }, [
    searchParams,
    isLoading,
    userConfig,
    serverConfig,
    hasProcessedQueryParams,
  ]);

  // Build effective config
  const effectiveConfig = useMemo(
    () => buildEffectiveConfig(serverConfig?.config ?? null, userConfig),
    [serverConfig, userConfig]
  );

  // Determine mode
  const mode: ConfigMode = useMemo(() => {
    if (serverConfig?.hasServerConfig) {
      return 'self-hosted';
    }
    // If user has configured anything, we're in "cli" mode (user-configured)
    const hasUserConfig = Object.values(userConfig).some(
      (v) => v !== undefined && v !== ''
    );
    if (hasUserConfig) {
      return 'cli';
    }
    return 'standalone';
  }, [serverConfig, userConfig]);

  // Update user config
  const updateUserConfig = useCallback(
    (updates: Partial<UserWorldConfig>) => {
      // Filter out fields that are locked by env
      const filtered = { ...updates };
      if (serverConfig?.config) {
        for (const [key, field] of Object.entries(serverConfig.config)) {
          if (field.isFromEnv && key in filtered) {
            delete filtered[key as keyof UserWorldConfig];
          }
        }
      }

      const newConfig = { ...userConfig, ...filtered };
      setUserConfig(newConfig);
      saveUserConfig(newConfig);
    },
    [userConfig, serverConfig]
  );

  // Reset user config
  const resetUserConfig = useCallback(() => {
    setUserConfig({});
    saveUserConfig({});
  }, []);

  // Convert to EnvMap for API calls
  const toEnvMap = useCallback((): EnvMap => {
    return {
      WORKFLOW_TARGET_WORLD: resolveTargetWorld(effectiveConfig.backend.value),
      WORKFLOW_VERCEL_ENV: effectiveConfig.vercelEnv.value,
      WORKFLOW_VERCEL_AUTH_TOKEN: effectiveConfig.vercelAuthToken.value,
      WORKFLOW_VERCEL_PROJECT: effectiveConfig.vercelProject.value,
      WORKFLOW_VERCEL_TEAM: effectiveConfig.vercelTeam.value,
      PORT: effectiveConfig.port.value,
      WORKFLOW_MANIFEST_PATH: effectiveConfig.manifestPath.value,
      WORKFLOW_LOCAL_DATA_DIR: effectiveConfig.dataDir.value,
      WORKFLOW_POSTGRES_URL: effectiveConfig.postgresUrl.value,
    };
  }, [effectiveConfig]);

  const value: WorldConfigContextValue = {
    mode,
    isLoading,
    serverConfig: serverConfig?.config ?? null,
    userConfig,
    effectiveConfig,
    updateUserConfig,
    resetUserConfig,
    toEnvMap,
    dataDirInfo: serverConfig?.dataDirInfo ?? null,
    serverCwd: serverConfig?.cwd ?? '',
    validateDataDirectory: validateDataDir,
  };

  return (
    <WorldConfigContext.Provider value={value}>
      {children}
    </WorldConfigContext.Provider>
  );
}

/**
 * Hook to access world configuration
 */
export function useWorldConfig(): WorldConfigContextValue {
  const context = useContext(WorldConfigContext);
  if (!context) {
    throw new Error('useWorldConfig must be used within a WorldConfigProvider');
  }
  return context;
}

/**
 * Helper to resolve backend ID to full package name for env
 */
function resolveTargetWorld(backend?: string): string | undefined {
  if (!backend) return undefined;
  const mapping: Record<string, string> = {
    postgres: '@workflow/world-postgres',
    // local and vercel don't need mapping - they're recognized as-is
  };
  return mapping[backend] || backend;
}
