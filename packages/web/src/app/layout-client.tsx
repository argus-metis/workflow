'use client';

import { TooltipProvider } from '@radix-ui/react-tooltip';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ThemeProvider, useTheme } from 'next-themes';
import { Suspense, useEffect, useRef } from 'react';
import { ConnectionStatus } from '@/components/display-utils/connection-status';
import { SettingsDropdown } from '@/components/settings-dropdown';
import { Toaster } from '@/components/ui/sonner';
import { WorldConfigProvider } from '@/lib/world-config-context';
import { Logo } from '../icons/logo';

interface LayoutClientProps {
  children: React.ReactNode;
}

/**
 * Inner content component that uses the world config context for navigation
 */
function LayoutContent({ children }: LayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();

  // Navigation params (not config params)
  const id = searchParams.get('id');
  const runId = searchParams.get('runId');
  const stepId = searchParams.get('stepId');
  const hookId = searchParams.get('hookId');
  const resource = searchParams.get('resource');
  const themeParam = searchParams.get('theme');

  // Track if we've already handled the initial navigation
  const hasNavigatedRef = useRef(false);

  // Sync theme from URL param to next-themes
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

  // Handle resource-based deep linking (for CLI-launched URLs)
  useEffect(() => {
    // Skip if we're not on the root path and we've already navigated
    if (pathname !== '/' && hasNavigatedRef.current) {
      return;
    }

    // Skip if we're already on a run page
    if (pathname.startsWith('/run/')) {
      hasNavigatedRef.current = true;
      return;
    }

    // Handle direct ID parameters without resource
    if (!resource) {
      if (runId) {
        let targetUrl = `/run/${runId}`;
        const params = new URLSearchParams();
        if (stepId) {
          params.set('sidebar', 'step');
          params.set('stepId', stepId);
        } else if (hookId) {
          params.set('sidebar', 'hook');
          params.set('hookId', hookId);
        }
        if (params.toString()) {
          targetUrl += `?${params.toString()}`;
        }
        hasNavigatedRef.current = true;
        router.push(targetUrl);
        return;
      }
      return;
    }

    // Handle resource-based navigation
    if (!id) {
      return;
    }

    let targetUrl: string;
    const params = new URLSearchParams();

    if (resource === 'run') {
      targetUrl = `/run/${id}`;
    } else if (resource === 'step' && runId) {
      targetUrl = `/run/${runId}`;
      params.set('sidebar', 'step');
      params.set('stepId', id);
    } else if (resource === 'stream' && runId) {
      targetUrl = `/run/${runId}`;
      params.set('sidebar', 'stream');
      params.set('streamId', id);
    } else if (resource === 'event' && runId) {
      targetUrl = `/run/${runId}`;
      params.set('sidebar', 'event');
      params.set('eventId', id);
    } else if (resource === 'hook' && runId) {
      targetUrl = `/run/${runId}`;
      params.set('sidebar', 'hook');
      params.set('hookId', id);
    } else if (resource === 'hook' && !runId) {
      targetUrl = '/';
      params.set('sidebar', 'hook');
      params.set('hookId', id);
    } else {
      console.warn(`Can't deep-link to ${resource} ${id}.`);
      return;
    }

    if (params.toString()) {
      targetUrl += `?${params.toString()}`;
    }

    hasNavigatedRef.current = true;
    router.push(targetUrl);
  }, [resource, id, runId, stepId, hookId, router, pathname]);

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

/**
 * Loading fallback for suspense boundary
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}

/**
 * Main layout client component that provides all context providers
 */
export function LayoutClient({ children }: LayoutClientProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="workflow-theme"
    >
      <Suspense fallback={<LoadingFallback />}>
        <WorldConfigProvider>
          <LayoutContent>{children}</LayoutContent>
        </WorldConfigProvider>
      </Suspense>
    </ThemeProvider>
  );
}
