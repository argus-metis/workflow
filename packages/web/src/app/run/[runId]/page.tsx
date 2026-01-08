'use client';

import { ErrorBoundary } from '@workflow/web-shared';
import { useParams, useSearchParams } from 'next/navigation';
import { RunDetailView } from '@/components/run-detail-view';
import { useWorldConfig } from '@/lib/world-config-context';

export default function RunDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toEnvMap } = useWorldConfig();

  const runId = params.runId as string;

  // Get selected item from URL params
  const stepId = searchParams.get('stepId');
  const eventId = searchParams.get('eventId');
  const hookId = searchParams.get('hookId');
  const selectedId = stepId || eventId || hookId || undefined;

  // Convert effective config to EnvMap for child components
  const env = toEnvMap();

  return (
    <ErrorBoundary
      title="Run Detail Error"
      description="Failed to load run details. Please try navigating back to the home page."
    >
      <RunDetailView env={env} runId={runId} selectedId={selectedId} />
    </ErrorBoundary>
  );
}
