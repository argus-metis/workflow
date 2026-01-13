'use client';

import {
  createProject,
  generateProjectId,
  isLocalWorld,
  type Project,
  type ProjectValidationResult,
} from '@workflow/utils';
import {
  checkSelfHostingMode,
  validateProjectConfig,
} from '@workflow/web-shared/server';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import useSWR from 'swr';

// LocalStorage keys
const CURRENT_PROJECT_KEY = 'workflow-current-project';
const PROJECT_HISTORY_KEY = 'workflow-project-history';
const MAX_HISTORY_SIZE = 10;

// Query param to env var mapping
const QUERY_TO_ENV_MAP: Record<string, string> = {
  backend: 'WORKFLOW_TARGET_WORLD',
  dataDir: 'WORKFLOW_LOCAL_DATA_DIR',
  port: 'PORT',
  manifestPath: 'WORKFLOW_MANIFEST_PATH',
  authToken: 'WORKFLOW_VERCEL_AUTH_TOKEN',
  project: 'WORKFLOW_VERCEL_PROJECT',
  team: 'WORKFLOW_VERCEL_TEAM',
  env: 'WORKFLOW_VERCEL_ENV',
  postgresUrl: 'WORKFLOW_POSTGRES_URL',
};

// Reverse mapping
const ENV_TO_QUERY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(QUERY_TO_ENV_MAP).map(([k, v]) => [v, k])
);

/**
 * Context value for project management.
 */
interface ProjectContextValue {
  /** Current active project */
  currentProject: Project | null;
  /** List of recent projects */
  projectHistory: Project[];
  /** Validation result for current project */
  validationResult: ProjectValidationResult | null;
  /** Whether validation is loading */
  isValidating: boolean;
  /** Whether the app is in self-hosting mode */
  isSelfHosting: boolean;
  /** Whether the context is still initializing */
  isInitializing: boolean;
  /** Set the current project */
  setCurrentProject: (project: Project) => void;
  /** Switch to a project from history */
  switchToProject: (projectId: string) => void;
  /** Delete a project from history */
  deleteProject: (projectId: string) => void;
  /** Create and set a new project */
  createNewProject: (options: {
    worldId: string;
    envMap: Record<string, string | undefined>;
    projectDir: string;
    name?: string;
  }) => Project;
  /** Refresh validation */
  revalidate: () => void;
  /** Convert current project to EnvMap for server actions */
  getEnvMap: () => Record<string, string | undefined>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/**
 * Load projects from localStorage.
 */
function loadFromStorage(): {
  current: Project | null;
  history: Project[];
} {
  if (typeof window === 'undefined') {
    return { current: null, history: [] };
  }

  try {
    const currentStr = localStorage.getItem(CURRENT_PROJECT_KEY);
    const historyStr = localStorage.getItem(PROJECT_HISTORY_KEY);

    const current = currentStr ? JSON.parse(currentStr) : null;
    const history = historyStr ? JSON.parse(historyStr) : [];

    return { current, history };
  } catch (error) {
    console.error('Failed to load projects from localStorage:', error);
    return { current: null, history: [] };
  }
}

/**
 * Save projects to localStorage.
 */
function saveToStorage(current: Project | null, history: Project[]) {
  if (typeof window === 'undefined') return;

  try {
    if (current) {
      localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(current));
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
    localStorage.setItem(PROJECT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save projects to localStorage:', error);
  }
}

/**
 * Parse query params and create a project from them.
 */
function parseQueryParamsToProject(
  searchParams: URLSearchParams
): Project | null {
  // Check if there are any workflow-related query params
  const hasWorkflowParams = Array.from(searchParams.keys()).some(
    (key) => key in QUERY_TO_ENV_MAP || key === 'projectDir'
  );

  if (!hasWorkflowParams) {
    return null;
  }

  const envMap: Record<string, string | undefined> = {};
  for (const [queryKey, envKey] of Object.entries(QUERY_TO_ENV_MAP)) {
    const value = searchParams.get(queryKey);
    if (value) {
      envMap[envKey] = value;
    }
  }

  // Get project directory from query params or use current working dir indicator
  const projectDir = searchParams.get('projectDir') || './';

  // Determine world ID from backend param
  const backend = searchParams.get('backend') || 'local';
  let worldId = backend;
  if (backend === '@workflow/world-local') worldId = 'local';
  if (backend === '@workflow/world-vercel') worldId = 'vercel';
  if (backend === '@workflow/world-postgres') worldId = 'postgres';

  return createProject({
    worldId,
    envMap,
    projectDir,
  });
}

/**
 * Build query params for view state only (not config params).
 */
function buildCleanUrl(
  pathname: string,
  searchParams: URLSearchParams
): string {
  const newParams = new URLSearchParams();

  // Keep only view-related params, remove config params
  const configKeys = new Set([...Object.keys(QUERY_TO_ENV_MAP), 'projectDir']);

  for (const [key, value] of searchParams.entries()) {
    if (!configKeys.has(key)) {
      newParams.set(key, value);
    }
  }

  const search = newParams.toString();
  return search ? `${pathname}?${search}` : pathname;
}

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentProject, setCurrentProjectState] = useState<Project | null>(
    null
  );
  const [projectHistory, setProjectHistory] = useState<Project[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitialized = useRef(false);

  // Check self-hosting mode
  const { data: selfHostingResult } = useSWR(
    'self-hosting-mode',
    async () => {
      const result = await checkSelfHostingMode();
      return result.success ? result.data : false;
    },
    { revalidateOnFocus: false }
  );
  const isSelfHosting = selfHostingResult ?? false;

  // Validate current project
  const {
    data: validationResult,
    isLoading: isValidating,
    mutate: revalidate,
  } = useSWR(
    currentProject ? ['validate-project', currentProject.id] : null,
    async () => {
      if (!currentProject) return null;
      const result = await validateProjectConfig(currentProject);
      return result.success ? result.data : null;
    },
    { revalidateOnFocus: true }
  );

  // Initialize from localStorage and query params
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const { current: storedCurrent, history: storedHistory } =
      loadFromStorage();

    // Check for query params that should initialize/override the project
    const queryProject = parseQueryParamsToProject(searchParams);

    if (queryProject) {
      // Query params take precedence - set as current project
      const updatedProject = {
        ...queryProject,
        lastUsedAt: Date.now(),
      };

      // Add to history if different from stored
      let newHistory = storedHistory;
      const existingIndex = newHistory.findIndex(
        (p) => p.id === updatedProject.id
      );
      if (existingIndex === -1) {
        // Add to beginning, limit size
        newHistory = [updatedProject, ...newHistory].slice(0, MAX_HISTORY_SIZE);
      } else {
        // Update existing
        newHistory = [
          updatedProject,
          ...newHistory.filter((p) => p.id !== updatedProject.id),
        ].slice(0, MAX_HISTORY_SIZE);
      }

      setCurrentProjectState(updatedProject);
      setProjectHistory(newHistory);
      saveToStorage(updatedProject, newHistory);

      // Remove config params from URL, keep view params
      const cleanUrl = buildCleanUrl(window.location.pathname, searchParams);
      router.replace(cleanUrl);
    } else if (storedCurrent) {
      // Use stored project
      setCurrentProjectState(storedCurrent);
      setProjectHistory(storedHistory);
    } else {
      // No project - create a default local project
      const defaultProject = createProject({
        worldId: 'local',
        envMap: {},
        projectDir: './',
      });
      setCurrentProjectState(defaultProject);
      setProjectHistory([defaultProject]);
      saveToStorage(defaultProject, [defaultProject]);
    }

    setIsInitializing(false);
  }, [searchParams, router]);

  // Set current project
  const setCurrentProject = useCallback((project: Project) => {
    const updatedProject = {
      ...project,
      lastUsedAt: Date.now(),
    };

    setCurrentProjectState(updatedProject);

    // Update history
    setProjectHistory((prev) => {
      const filtered = prev.filter((p) => p.id !== project.id);
      const newHistory = [updatedProject, ...filtered].slice(
        0,
        MAX_HISTORY_SIZE
      );
      saveToStorage(updatedProject, newHistory);
      return newHistory;
    });
  }, []);

  // Switch to a project from history
  const switchToProject = useCallback(
    (projectId: string) => {
      const project = projectHistory.find((p) => p.id === projectId);
      if (project) {
        setCurrentProject(project);
      }
    },
    [projectHistory, setCurrentProject]
  );

  // Delete a project from history
  const deleteProject = useCallback(
    (projectId: string) => {
      setProjectHistory((prev) => {
        const newHistory = prev.filter((p) => p.id !== projectId);

        // If we deleted the current project, switch to first in history or create new
        if (currentProject?.id === projectId) {
          if (newHistory.length > 0) {
            setCurrentProjectState(newHistory[0]);
            saveToStorage(newHistory[0], newHistory);
          } else {
            const defaultProject = createProject({
              worldId: 'local',
              envMap: {},
              projectDir: './',
            });
            setCurrentProjectState(defaultProject);
            saveToStorage(defaultProject, [defaultProject]);
            return [defaultProject];
          }
        } else {
          saveToStorage(currentProject, newHistory);
        }

        return newHistory;
      });
    },
    [currentProject]
  );

  // Create and set a new project
  const createNewProject = useCallback(
    (options: {
      worldId: string;
      envMap: Record<string, string | undefined>;
      projectDir: string;
      name?: string;
    }) => {
      const project = createProject(options);
      setCurrentProject(project);
      return project;
    },
    [setCurrentProject]
  );

  // Get env map for server actions
  const getEnvMap = useCallback(() => {
    if (!currentProject) return {};

    // Build full env map including WORKFLOW_TARGET_WORLD
    const envMap: Record<string, string | undefined> = {
      ...currentProject.envMap,
    };

    // Set WORKFLOW_TARGET_WORLD based on worldId
    if (currentProject.worldId === 'local') {
      envMap.WORKFLOW_TARGET_WORLD = '@workflow/world-local';
    } else if (currentProject.worldId === 'vercel') {
      envMap.WORKFLOW_TARGET_WORLD = '@workflow/world-vercel';
    } else if (currentProject.worldId === 'postgres') {
      envMap.WORKFLOW_TARGET_WORLD = '@workflow/world-postgres';
    } else {
      envMap.WORKFLOW_TARGET_WORLD = currentProject.worldId;
    }

    // For local world, if no data dir specified, use projectDir
    if (
      isLocalWorld(currentProject.worldId) &&
      !envMap.WORKFLOW_LOCAL_DATA_DIR
    ) {
      envMap.WORKFLOW_LOCAL_DATA_DIR = currentProject.projectDir;
    }

    return envMap;
  }, [currentProject]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      currentProject,
      projectHistory,
      validationResult: validationResult ?? null,
      isValidating,
      isSelfHosting,
      isInitializing,
      setCurrentProject,
      switchToProject,
      deleteProject,
      createNewProject,
      revalidate: () => revalidate(),
      getEnvMap,
    }),
    [
      currentProject,
      projectHistory,
      validationResult,
      isValidating,
      isSelfHosting,
      isInitializing,
      setCurrentProject,
      switchToProject,
      deleteProject,
      createNewProject,
      revalidate,
      getEnvMap,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

/**
 * Hook to access the project context.
 */
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

/**
 * Hook to get just the env map for server actions.
 * This is a convenience hook for components that just need the env map.
 */
export function useEnvMap(): Record<string, string | undefined> {
  const { getEnvMap } = useProject();
  return useMemo(() => getEnvMap(), [getEnvMap]);
}
