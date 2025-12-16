'use client';

import { ArrowLeft, ChevronRight, InfoIcon, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { WorldConfig } from '@/lib/config-world';

interface ConnectionStatusProps {
  config: WorldConfig;
  /** Whether we're currently on the setup page */
  isSetupPage?: boolean;
  /** Whether the current config is valid/connected */
  isConnected?: boolean;
  /** URL to navigate to setup page */
  setupUrl?: string;
  /** URL to go back from setup page */
  backUrl?: string;
}

const getConnectionInfo = (
  backend: string,
  config: WorldConfig
): { provider: string; parts: string[] } => {
  if (backend === 'vercel') {
    const parts: string[] = [];
    if (config.env) parts.push(`env: ${config.env}`);
    if (config.project) parts.push(`project: ${config.project}`);
    if (config.team) parts.push(`team: ${config.team}`);

    return { provider: 'Vercel', parts };
  }

  if (backend === 'local') {
    // Local backend
    const parts: string[] = [];
    if (config.dataDir) {
      parts.push(`dir: ${config.dataDir}`);
    }
    if (config.port) parts.push(`port: ${config.port}`);

    return { provider: 'Local', parts };
  }

  if (backend === 'postgres') {
    const parts: string[] = [];
    if (config.postgresUrl) {
      // Show just the host part for security
      try {
        const url = new URL(config.postgresUrl);
        parts.push(`host: ${url.host}`);
      } catch {
        parts.push('url: configured');
      }
    }
    return { provider: 'PostgreSQL', parts };
  }

  return { provider: config.backend || 'unknown', parts: [] };
};

export function ConnectionStatus({
  config,
  isSetupPage = false,
  isConnected = true,
  setupUrl,
  backUrl,
}: ConnectionStatusProps) {
  const backend = config.backend || 'local';
  const { provider, parts } = getConnectionInfo(backend, config);

  // On setup page with valid connection - show back button
  if (isSetupPage && isConnected && backUrl) {
    return (
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href={backUrl}>
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </Button>
    );
  }

  // On setup page without valid connection - show "Not connected"
  if (isSetupPage && !isConnected) {
    return (
      <div className="text-sm text-destructive flex items-center gap-2">
        <span className="font-medium">Not connected</span>
      </div>
    );
  }

  // Normal page - show connection status with change button
  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <span className="font-medium">Connected to: {provider}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="w-4 h-4 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              {parts.map((part) => (
                <span key={part}>{part}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      {setupUrl && (
        <Button variant="ghost" size="sm" asChild className="gap-1 px-2">
          <Link href={setupUrl}>
            <Settings2 className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Change</span>
            <ChevronRight className="h-3 w-3 hidden sm:block" />
          </Link>
        </Button>
      )}
    </div>
  );
}
