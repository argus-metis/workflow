'use client';

import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';
import { ConnectionStatus } from '@/components/display-utils/connection-status';
import { SettingsDropdown } from '@/components/settings-dropdown';
import { Toaster } from '@/components/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProjectProvider, useProject } from '@/lib/project-context';
import { Logo } from '../icons/logo';

interface LayoutClientProps {
  children: React.ReactNode;
}

/**
 * Self-hosting indicator shown in the bottom-right corner.
 */
function SelfHostingIndicator() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-2 rounded-full bg-muted/80 backdrop-blur-sm border shadow-sm cursor-help">
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-sm">
            This app is running in self-hosted mode. Environment configuration
            is managed server-side and cannot be modified from the UI.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function LayoutContent({ children }: LayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();
  const { isSelfHosting, isInitializing } = useProject();

  const runId = searchParams.get('runId');
  const stepId = searchParams.get('stepId');
  const hookId = searchParams.get('hookId');
  const resource = searchParams.get('resource');
  const id = searchParams.get('id');
  const themeParam = searchParams.get('theme');

  // Track if we've already handled the initial navigation
  const hasNavigatedRef = useRef(false);

  // Sync theme from URL param to next-themes (one-time or when explicitly changed)
  useEffect(() => {
    if (
      themeParam &&
      (themeParam === 'light' ||
        themeParam === 'dark' ||
        themeParam === 'system')
    ) {
      setTheme(themeParam);
    }
  }, [themeParam, setTheme]);

  // If initialized with a resource/id or direct ID params, we navigate to the appropriate page
  // Only run this logic once on mount or when we're on the root path with special params
  useEffect(() => {
    // Wait for initialization
    if (isInitializing) return;

    // Skip if we're not on the root path and we've already navigated
    if (pathname !== '/' && hasNavigatedRef.current) {
      return;
    }

    // Skip if we're already on a run page (prevents interference with back navigation)
    if (pathname.startsWith('/run/')) {
      hasNavigatedRef.current = true;
      return;
    }

    // Handle direct ID parameters (runId, stepId, hookId) without resource
    if (!resource) {
      if (runId) {
        // If we have a runId, open that run's detail view
        let targetUrl: string;
        if (stepId) {
          // Open run with step sidebar
          targetUrl = `/run/${runId}?sidebar=step&stepId=${stepId}`;
        } else if (hookId) {
          // Open run with hook sidebar
          targetUrl = `/run/${runId}?sidebar=hook&hookId=${hookId}`;
        } else {
          // Just open the run
          targetUrl = `/run/${runId}`;
        }
        hasNavigatedRef.current = true;
        router.push(targetUrl);
        return;
      }
      // No resource and no direct params, nothing to do
      return;
    }

    // Handle resource-based navigation
    if (!id) {
      return;
    }

    let targetUrl: string;
    if (resource === 'run') {
      targetUrl = `/run/${id}`;
    } else if (resource === 'step' && runId) {
      targetUrl = `/run/${runId}?sidebar=step&stepId=${id}`;
    } else if (resource === 'stream' && runId) {
      targetUrl = `/run/${runId}?sidebar=stream&streamId=${id}`;
    } else if (resource === 'event' && runId) {
      targetUrl = `/run/${runId}?sidebar=event&eventId=${id}`;
    } else if (resource === 'hook' && runId) {
      targetUrl = `/run/${runId}?sidebar=hook&hookId=${id}`;
    } else if (resource === 'hook' && !runId) {
      // Hook without runId - go to home page with hook sidebar
      targetUrl = `/?sidebar=hook&hookId=${id}`;
    } else {
      console.warn(`Can't deep-link to ${resource} ${id}.`);
      return;
    }

    hasNavigatedRef.current = true;
    router.push(targetUrl);
  }, [resource, id, runId, stepId, hookId, router, pathname, isInitializing]);

  // In self-hosting mode, hide the header entirely
  if (isSelfHosting) {
    return (
      <div className="min-h-screen flex flex-col">
        <TooltipProvider delayDuration={0}>
          {/* Scrollable Content - no header */}
          <div className="flex-1 px-6 pt-6">{children}</div>
          <SelfHostingIndicator />
        </TooltipProvider>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TooltipProvider delayDuration={0}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Link href="/">
              <h1
                className="flex items-center gap-2"
                title="Workflow Observability"
              >
                <Logo />
              </h1>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <ConnectionStatus />
              <SettingsDropdown />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 px-6 pt-6">{children}</div>
      </TooltipProvider>
      <Toaster />
    </div>
  );
}

export function LayoutClient({ children }: LayoutClientProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="workflow-theme"
    >
      <ProjectProvider>
        <LayoutContent>{children}</LayoutContent>
      </ProjectProvider>
    </ThemeProvider>
  );
}
