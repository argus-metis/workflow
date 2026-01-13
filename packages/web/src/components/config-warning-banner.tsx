'use client';

import { AlertTriangle, Settings } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useProject } from '@/lib/project-context';

interface ConfigWarningBannerProps {
  /** Whether there's an error or no data in the current view */
  hasViewError?: boolean;
  /** Whether the view is currently empty */
  isViewEmpty?: boolean;
}

/**
 * Banner that shows when project configuration is invalid and the view has errors.
 * Only shows when both conditions are met:
 * 1. The current project has validation errors
 * 2. The current view (runs table, etc.) has an error or is empty
 */
export function ConfigWarningBanner({
  hasViewError = false,
  isViewEmpty = false,
}: ConfigWarningBannerProps) {
  const { validationStatus, isSelfHosting, currentProject } = useProject();

  // Don't show in self-hosting mode
  if (isSelfHosting) {
    return null;
  }

  // Only show if config is invalid AND the view has issues
  const isConfigInvalid = !validationStatus.valid;
  const viewHasIssues = hasViewError || isViewEmpty;

  if (!isConfigInvalid || !viewHasIssues) {
    return null;
  }

  const criticalErrors = validationStatus.errors.filter((e) => e.critical);
  const hasNoProject = !currentProject;

  return (
    <Alert className="mb-4 bg-amber-500/10 border-amber-500/30">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-700 dark:text-amber-400">
        {hasNoProject
          ? 'No Project Configured'
          : 'Configuration Issue Detected'}
      </AlertTitle>
      <AlertDescription className="text-amber-600 dark:text-amber-300">
        <p className="mb-2">
          {hasNoProject
            ? 'Configure a project to view workflow data.'
            : criticalErrors.length > 0
              ? 'Your project configuration has errors that may prevent data from loading.'
              : 'Your project configuration may need attention.'}
        </p>
        {criticalErrors.length > 0 && (
          <ul className="list-disc list-inside mb-2 text-sm">
            {criticalErrors.slice(0, 3).map((error, i) => (
              <li key={i}>{error.message}</li>
            ))}
            {criticalErrors.length > 3 && (
              <li>...and {criticalErrors.length - 3} more</li>
            )}
          </ul>
        )}
        <Link href="/projects">
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/50 hover:bg-amber-500/20"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Project
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
