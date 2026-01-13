'use client';

import { ErrorBoundary } from '@workflow/web-shared';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ConfigWarningBanner } from '@/components/config-warning-banner';
import { HooksTable } from '@/components/hooks-table';
import { RunsTable } from '@/components/runs-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowsList } from '@/components/workflows-list';
import type { WorldConfig } from '@/lib/config-world';
import { useProject } from '@/lib/project-context';
import { useHookIdState, useSidebarState, useTabState } from '@/lib/url-state';

/**
 * Convert project state to the legacy WorldConfig format.
 * This maintains backward compatibility with existing components
 * while we migrate to the new project-based system.
 */
function useProjectAsWorldConfig(): WorldConfig {
  const { currentProject } = useProject();

  return useMemo(() => {
    if (!currentProject) {
      return {
        backend: 'local',
        dataDir: './',
      };
    }

    const env = currentProject.envMap;
    return {
      backend: currentProject.worldId,
      env: env.WORKFLOW_VERCEL_ENV,
      authToken: env.WORKFLOW_VERCEL_AUTH_TOKEN,
      project: env.WORKFLOW_VERCEL_PROJECT,
      team: env.WORKFLOW_VERCEL_TEAM,
      port: env.PORT,
      dataDir: env.WORKFLOW_LOCAL_DATA_DIR || currentProject.projectDir || './',
      manifestPath: env.WORKFLOW_MANIFEST_PATH,
      postgresUrl: env.WORKFLOW_POSTGRES_URL,
    };
  }, [currentProject]);
}

export default function Home() {
  const router = useRouter();
  const config = useProjectAsWorldConfig();
  const { validationStatus, currentProject } = useProject();
  const [sidebar] = useSidebarState();
  const [hookId] = useHookIdState();
  const [tab, setTab] = useTabState();

  const selectedHookId = sidebar === 'hook' && hookId ? hookId : undefined;

  // Only show workflows tab for local backend
  const isLocalBackend = config.backend === 'local' || !config.backend;

  const handleRunClick = (runId: string, streamId?: string) => {
    if (!streamId) {
      router.push(`/run/${runId}`);
    } else {
      router.push(`/run/${runId}/streams/${streamId}`);
    }
  };

  const handleHookSelect = (hookId: string, runId?: string) => {
    if (hookId) {
      router.push(`/run/${runId}?sidebar=hook&hookId=${hookId}`);
    } else {
      router.push(`/run/${runId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <ConfigWarningBanner
        hasViewError={false}
        isViewEmpty={!currentProject}
      />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          {isLocalBackend && (
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="runs">
          <ErrorBoundary
            title="Runs Error"
            description="Failed to load workflow runs. Please try refreshing the page."
          >
            <RunsTable config={config} onRunClick={handleRunClick} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="hooks">
          <ErrorBoundary
            title="Hooks Error"
            description="Failed to load hooks. Please try refreshing the page."
          >
            <HooksTable
              config={config}
              onHookClick={handleHookSelect}
              selectedHookId={selectedHookId}
            />
          </ErrorBoundary>
        </TabsContent>
        {isLocalBackend && (
          <TabsContent value="workflows">
            <ErrorBoundary
              title="Workflows Error"
              description="Failed to load workflow graph data. Please try refreshing the page."
            >
              <WorkflowsList config={config} />
            </ErrorBoundary>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
