'use client';

import { getWorldById, isLocalWorld, type Project } from '@workflow/utils';
import {
  findWorkflowDataDir,
  type WorkflowDataDirInfo,
} from '@workflow/utils/check-data-dir';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Settings2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProject } from '@/lib/project-context';

/**
 * Get connection info display based on project configuration.
 */
function getConnectionInfo(
  project: Project | null,
  dataDirInfo: WorkflowDataDirInfo | null | undefined
): { provider: string; parts: string[] } {
  if (!project) {
    return { provider: 'Not configured', parts: [] };
  }

  const world = getWorldById(project.worldId);
  const worldName = world?.name || project.worldId;

  if (isLocalWorld(project.worldId)) {
    const parts: string[] = [];
    if (dataDirInfo?.projectDir) {
      parts.push(`project: ${dataDirInfo.projectDir}`);
    }
    const port = project.envMap.PORT;
    if (port) parts.push(`port: ${port}`);

    return { provider: 'Local Dev', parts };
  }

  if (project.worldId === 'vercel') {
    const parts: string[] = [];
    const env = project.envMap.WORKFLOW_VERCEL_ENV;
    const projectName = project.envMap.WORKFLOW_VERCEL_PROJECT;
    const team = project.envMap.WORKFLOW_VERCEL_TEAM;

    if (env) parts.push(`env: ${env}`);
    if (projectName) parts.push(`project: ${projectName}`);
    if (team) parts.push(`team: ${team}`);

    return { provider: 'Connected to Vercel', parts };
  }

  return {
    provider: `Connected to ${worldName}`,
    parts: [],
  };
}

export function ConnectionStatus() {
  const router = useRouter();
  const { currentProject, validationResult, isValidating, isSelfHosting } =
    useProject();

  // Fetch data dir info for local world
  const { data: dataDirInfo } = useSWR<WorkflowDataDirInfo | null>(
    currentProject && isLocalWorld(currentProject.worldId)
      ? `data-dir-info:${currentProject.envMap.WORKFLOW_LOCAL_DATA_DIR || currentProject.projectDir}`
      : null,
    async () => {
      if (!currentProject) return null;
      const dataDir =
        currentProject.envMap.WORKFLOW_LOCAL_DATA_DIR ||
        currentProject.projectDir;
      return findWorkflowDataDir(dataDir);
    },
    { revalidateOnFocus: false }
  );

  const isValid = validationResult?.valid ?? true;
  const { provider, parts } = getConnectionInfo(currentProject, dataDirInfo);

  // Get short name for display
  const subString = isLocalWorld(currentProject?.worldId || '')
    ? dataDirInfo?.shortName
    : currentProject?.worldId === 'vercel'
      ? currentProject?.envMap.WORKFLOW_VERCEL_ENV
      : undefined;

  const handleNavigateToSettings = () => {
    router.push('/settings');
  };

  // Status icon based on validation state
  const StatusIcon = () => {
    if (isValidating) {
      return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    }
    if (!isValid) {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  };

  // In self-hosting mode, just show a simple indicator
  if (isSelfHosting) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span className="font-medium">Server configured</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <StatusIcon />
        <span className="font-medium">
          {provider} {subString ? `(${subString})` : ''}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-4 h-4 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              {parts.map((part) => (
                <span key={part}>{part}</span>
              ))}
              {!isValid && validationResult?.errors && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-destructive font-medium">
                    Configuration errors:
                  </span>
                  {validationResult.errors.map((error, i) => (
                    <div key={i} className="text-destructive text-xs">
                      {error.field}: {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNavigateToSettings}
        className="h-8 w-8 p-0"
        title="Project Settings"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
