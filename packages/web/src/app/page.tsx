'use client';

import { ErrorBoundary } from '@workflow/web-shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { HooksTable } from '@/components/hooks-table';
import { RunsTable } from '@/components/runs-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowsList } from '@/components/workflows-list';
import { useWorldConfig } from '@/lib/world-config-context';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { effectiveConfig, toEnvMap } = useWorldConfig();

  // Get navigation state from URL params (not config params)
  const sidebar = searchParams.get('sidebar');
  const hookId = searchParams.get('hookId');
  const tab = searchParams.get('tab') || 'runs';

  const selectedHookId = sidebar === 'hook' && hookId ? hookId : undefined;

  // Only show workflows tab for local backend
  const backend = effectiveConfig.backend.value || 'local';
  const isLocalBackend =
    backend === 'local' || backend === '@workflow/world-local';

  // Convert effective config to the legacy WorldConfig format for child components
  const env = toEnvMap();

  const handleRunClick = (runId: string, streamId?: string) => {
    if (!streamId) {
      router.push(`/run/${runId}`);
    } else {
      router.push(`/run/${runId}/streams/${streamId}`);
    }
  };

  const handleHookSelect = (hookId: string, runId?: string) => {
    if (hookId && runId) {
      router.push(`/run/${runId}?sidebar=hook&hookId=${hookId}`);
    } else if (runId) {
      router.push(`/run/${runId}`);
    }
  };

  const setTab = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
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
            <RunsTable env={env} onRunClick={handleRunClick} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="hooks">
          <ErrorBoundary
            title="Hooks Error"
            description="Failed to load hooks. Please try refreshing the page."
          >
            <HooksTable
              env={env}
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
              <WorkflowsList env={env} />
            </ErrorBoundary>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
