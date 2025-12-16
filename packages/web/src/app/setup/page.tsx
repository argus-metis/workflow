'use client';

import {
  AlertTriangle,
  Clock,
  Database,
  Folder,
  Plus,
  Server,
  Trash2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ConfigForm } from '@/components/config-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  buildUrlWithConfig,
  useQueryParamConfig,
  useUpdateConfigQueryParams,
} from '@/lib/config';
import type { WorldConfig } from '@/lib/config-world';
import { useWorldsAvailability } from '@/lib/hooks';
import {
  getBackendType,
  getRecentConfigs,
  type RecentConfig,
  removeRecentConfig,
  saveRecentConfig,
} from '@/lib/recent-configs';
import { cn } from '@/lib/utils';
import { Logo } from '../../icons/logo';

function getBackendIcon(config: WorldConfig) {
  const type = getBackendType(config);
  switch (type) {
    case 'local':
      return <Folder className="h-4 w-4" />;
    case 'postgres':
      return <Database className="h-4 w-4" />;
    case 'vercel':
      return <Server className="h-4 w-4" />;
    default:
      return <Server className="h-4 w-4" />;
  }
}

function getBackendLabel(config: WorldConfig) {
  const type = getBackendType(config);
  switch (type) {
    case 'local':
      return 'Local';
    case 'postgres':
      return 'PostgreSQL';
    case 'vercel':
      return 'Vercel';
    default:
      return config.backend || 'Unknown';
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

interface RecentProjectCardProps {
  recent: RecentConfig;
  onSelect: () => void;
  onRemove: () => void;
}

function RecentProjectCard({
  recent,
  onSelect,
  onRemove,
}: RecentProjectCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-muted text-muted-foreground">
          {getBackendIcon(recent.config)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{recent.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <span>{getBackendLabel(recent.config)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(recent.lastUsed)}
            </span>
          </div>
          {recent.config.dataDir && (
            <div className="text-xs text-muted-foreground truncate mt-1 font-mono">
              {recent.config.dataDir}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity"
          title="Remove from history"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </button>
  );
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = useQueryParamConfig();
  const updateConfig = useUpdateConfigQueryParams();

  const [recentConfigs, setRecentConfigs] = useState<RecentConfig[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);

  const { data: worldsAvailability = [], isLoading: isLoadingWorlds } =
    useWorldsAvailability();

  // Load recent configs on mount
  useEffect(() => {
    setRecentConfigs(getRecentConfigs());
  }, []);

  // Get the original destination from query params
  const redirectTo = searchParams.get('redirectTo') || '/';
  const needsConfig = searchParams.get('needsConfig') === '1';

  // Show new project form if no recent configs or explicitly requested
  const hasRecentConfigs = recentConfigs.length > 0;
  const showForm = showNewProject || !hasRecentConfigs;

  const handleApply = (newConfig: WorldConfig) => {
    // Save to recent configs
    saveRecentConfig(newConfig);
    setRecentConfigs(getRecentConfigs());

    updateConfig(newConfig);
    // Navigate to the intended destination
    router.push(buildUrlWithConfig(redirectTo, newConfig));
  };

  const handleSelectRecent = (recent: RecentConfig) => {
    // Update last used time
    saveRecentConfig(recent.config);
    setRecentConfigs(getRecentConfigs());

    updateConfig(recent.config);
    router.push(buildUrlWithConfig(redirectTo, recent.config));
  };

  const handleRemoveRecent = (id: string) => {
    removeRecentConfig(id);
    setRecentConfigs(getRecentConfigs());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Logo />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Warning banner if opened due to config error */}
          {needsConfig && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Configuration Required</p>
                <p className="mt-1 text-amber-600 dark:text-amber-500">
                  The CLI couldn&apos;t find a valid data source. Please select
                  a recent project or configure a new connection.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left pane: Recent Projects */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Projects
                </CardTitle>
                <CardDescription>
                  {hasRecentConfigs
                    ? 'Select a previously connected project'
                    : 'No recent projects found'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasRecentConfigs ? (
                  <div className="space-y-2">
                    {recentConfigs.map((recent) => (
                      <RecentProjectCard
                        key={recent.id}
                        recent={recent}
                        onSelect={() => handleSelectRecent(recent)}
                        onRemove={() => handleRemoveRecent(recent.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Connect to a project to get started.
                      <br />
                      It will appear here for quick access.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right pane: Connect to a project */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Connect to a Project
                </CardTitle>
                <CardDescription>
                  Configure a new connection to view workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showForm ? (
                  <>
                    <ConfigForm
                      config={config}
                      worldsAvailability={worldsAvailability}
                      isLoadingWorlds={isLoadingWorlds}
                      onApply={handleApply}
                      applyButtonText="Connect"
                      showCancel={hasRecentConfigs}
                      onCancel={() => setShowNewProject(false)}
                      cancelButtonText="Cancel"
                    />

                    {/* Help text */}
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-xs text-muted-foreground text-center">
                        Need help?{' '}
                        <a
                          href="https://useworkflow.dev/docs/getting-started"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Read the documentation
                        </a>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Button
                      onClick={() => setShowNewProject(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Connection
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">
                      Or select a recent project from the left
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}
