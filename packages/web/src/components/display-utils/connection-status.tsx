'use client';

import { getWorldById } from '@workflow/utils/worlds-manifest';
import {
  AlertCircle,
  CheckCircle,
  InfoIcon,
  Loader2,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProject } from '@/lib/project-context';
import { useDataDirInfo } from '@/lib/hooks';

/**
 * Connection status display with project info and navigation to project settings.
 */
export function ConnectionStatus() {
  const router = useRouter();
  const {
    currentProject,
    validationStatus,
    validateCurrentProject,
    isSelfHosting,
  } = useProject();

  // In self-hosting mode, don't show the connection status
  if (isSelfHosting) {
    return null;
  }

  // Get world info
  const world = currentProject?.worldId
    ? getWorldById(currentProject.worldId)
    : null;
  const worldName = world?.name || currentProject?.worldId || 'Local';
  const isLocal = currentProject?.worldId === 'local' || !currentProject?.worldId;
  const dataDir = currentProject?.envMap.WORKFLOW_LOCAL_DATA_DIR;

  // Get data dir info for local world
  const { data: dataDirInfo } = useDataDirInfo(isLocal ? (dataDir || './') : '');

  // Validate project on mount and when it changes
  useEffect(() => {
    if (currentProject && !validationStatus.loading && !validationStatus.lastChecked) {
      validateCurrentProject();
    }
  }, [currentProject, validationStatus.loading, validationStatus.lastChecked, validateCurrentProject]);

  // Revalidate on focus
  useEffect(() => {
    const handleFocus = () => {
      if (currentProject) {
        validateCurrentProject();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentProject, validateCurrentProject]);

  // Determine status
  const isValid = validationStatus.valid;
  const isLoading = validationStatus.loading;
  const hasErrors = validationStatus.errors.length > 0;
  const criticalErrors = validationStatus.errors.filter((e) => e.critical);

  // Build display info
  const displayInfo = getDisplayInfo(worldName, currentProject, dataDirInfo, isLocal);

  const handleNavigateToSettings = () => {
    router.push('/projects');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : isValid ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-destructive" />
        )}

        <span className="font-medium">{displayInfo.title}</span>

        {displayInfo.subtitle && (
          <span className="text-muted-foreground">({displayInfo.subtitle})</span>
        )}
      </div>

      {/* Info tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <InfoIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{displayInfo.title}</div>
            {displayInfo.details.map((detail, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                {detail}
              </div>
            ))}
            {hasErrors && (
              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-destructive">
                  {criticalErrors.length > 0
                    ? `${criticalErrors.length} critical error(s)`
                    : `${validationStatus.errors.length} warning(s)`}
                </div>
                {validationStatus.errors.slice(0, 3).map((error, i) => (
                  <div
                    key={i}
                    className={`text-xs ${error.critical ? 'text-destructive' : 'text-amber-600'}`}
                  >
                    • {error.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Settings button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNavigateToSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Project Settings</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface DisplayInfo {
  title: string;
  subtitle: string | null;
  details: string[];
}

function getDisplayInfo(
  worldName: string,
  project: ReturnType<typeof useProject>['currentProject'],
  dataDirInfo: { shortName?: string; projectDir?: string } | undefined,
  isLocal: boolean
): DisplayInfo {
  const details: string[] = [];

  if (!project) {
    return {
      title: 'No project configured',
      subtitle: null,
      details: ['Configure a project to view workflow data'],
    };
  }

  if (isLocal) {
    const subtitle = dataDirInfo?.shortName || null;
    if (dataDirInfo?.projectDir) {
      details.push(`Project: ${dataDirInfo.projectDir}`);
    }
    if (project.envMap.PORT) {
      details.push(`Port: ${project.envMap.PORT}`);
    }
    return {
      title: 'Local Dev',
      subtitle,
      details,
    };
  }

  if (project.worldId === 'vercel') {
    const subtitle = project.envMap.WORKFLOW_VERCEL_ENV || 'production';
    if (project.envMap.WORKFLOW_VERCEL_PROJECT) {
      details.push(`Project: ${project.envMap.WORKFLOW_VERCEL_PROJECT}`);
    }
    if (project.envMap.WORKFLOW_VERCEL_TEAM) {
      details.push(`Team: ${project.envMap.WORKFLOW_VERCEL_TEAM}`);
    }
    return {
      title: 'Vercel',
      subtitle,
      details,
    };
  }

  if (project.worldId === 'postgres') {
    return {
      title: 'PostgreSQL',
      subtitle: null,
      details: project.envMap.WORKFLOW_POSTGRES_URL
        ? ['Connection configured']
        : ['Connection URL not set'],
    };
  }

  // Generic world
  return {
    title: worldName,
    subtitle: null,
    details: [`World: ${project.worldId}`],
  };
}
