/** biome-ignore-all lint/correctness/useUniqueElementIds: <not relevant> */
'use client';

import {
  AlertCircle,
  ExternalLink,
  Info,
  Lock,
  Settings,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type ConfigSource,
  type TrackedConfigField,
  type UserWorldConfig,
  useWorldConfig,
} from '@/lib/world-config-context';

interface SettingsSidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Badge showing the source of a configuration value
 */
function SourceBadge({ source }: { source: ConfigSource }) {
  if (source === 'env') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Lock className="w-3 h-3" />
            ENV
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Set via server environment variable (read-only)
        </TooltipContent>
      </Tooltip>
    );
  }

  if (source === 'user') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
        User
      </span>
    );
  }

  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
      Default
    </span>
  );
}

/**
 * A configuration field row with source indicator
 */
function ConfigField({
  label,
  field,
  envVarName,
  placeholder,
  type = 'text',
  onChange,
  error,
  helpText,
}: {
  label: string;
  field: TrackedConfigField<string>;
  envVarName: string;
  placeholder?: string;
  type?: 'text' | 'password';
  onChange: (value: string) => void;
  error?: string;
  helpText?: string;
}) {
  const isLocked = !field.editable;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={envVarName} className="flex items-center gap-2">
          {label}
          <SourceBadge source={field.source} />
        </Label>
        {isLocked && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">
                {envVarName}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              This value is set via the {envVarName} environment variable
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <Input
        id={envVarName}
        type={type}
        value={field.value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={isLocked}
        className={`${error ? 'border-destructive' : ''} ${isLocked ? 'bg-muted cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-sm text-destructive break-words">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

export function SettingsSidebar({
  open: controlledOpen,
  onOpenChange,
}: SettingsSidebarProps = {}) {
  const {
    mode,
    isLoading,
    effectiveConfig,
    updateUserConfig,
    resetUserConfig,
    serverCwd,
    dataDirInfo,
  } = useWorldConfig();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Local state for editing (tracks uncommitted changes)
  const [localChanges, setLocalChanges] = useState<Partial<UserWorldConfig>>(
    {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset local changes when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setLocalChanges({});
      setErrors({});
    }
  }, [isOpen]);

  // Get effective value for a field (local change or effective config)
  const getFieldValue = useCallback(
    (key: keyof UserWorldConfig): TrackedConfigField<string> => {
      const effectiveField = effectiveConfig[key];
      if (key in localChanges) {
        return {
          ...effectiveField,
          value: localChanges[key] || '',
          source: 'user' as const,
        };
      }
      return effectiveField;
    },
    [effectiveConfig, localChanges]
  );

  // Handle field change
  const handleFieldChange = useCallback(
    (key: keyof UserWorldConfig, value: string) => {
      // Don't allow changes to env-locked fields
      if (!effectiveConfig[key].editable) return;

      setLocalChanges((prev) => ({ ...prev, [key]: value }));
      // Clear error for this field
      setErrors((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    },
    [effectiveConfig]
  );

  // Check if there are unsaved changes
  const hasChanges = Object.keys(localChanges).length > 0;

  // Apply changes
  const handleApply = useCallback(() => {
    updateUserConfig(localChanges);
    setLocalChanges({});
    setIsOpen(false);
  }, [localChanges, updateUserConfig, setIsOpen]);

  // Cancel and discard changes
  const handleCancel = useCallback(() => {
    setLocalChanges({});
    setErrors({});
    setIsOpen(false);
  }, [setIsOpen]);

  // Determine which fields to show based on current backend
  const backend = getFieldValue('backend').value || 'local';
  const isLocal = backend === 'local';
  const isPostgres = backend === 'postgres';
  const isVercel = backend === 'vercel';

  // Check if all config is from env (self-hosted mode)
  const isFullyEnvConfigured =
    mode === 'self-hosted' && !effectiveConfig.backend.editable;

  return (
    <>
      {controlledOpen === undefined && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-full hover:bg-accent transition-colors"
          title="Configuration"
        >
          <Settings className="h-6 w-6" />
        </button>
      )}
      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 bg-black/50 z-40 cursor-default"
            onClick={handleCancel}
            aria-label="Close configuration panel"
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-[420px] bg-background border-l shadow-lg z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Configuration</h2>
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  size="icon"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">
                    Loading configuration...
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Mode indicator */}
                  {isFullyEnvConfigured && (
                    <Alert className="!bg-blue-500/10 !border-blue-500/20">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Self-Hosted Mode</AlertTitle>
                      <AlertDescription>
                        Configuration is set via server environment variables.
                        Fields marked with{' '}
                        <span className="inline-flex items-center gap-1 text-xs px-1 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
                          <Lock className="w-3 h-3" />
                          ENV
                        </span>{' '}
                        cannot be changed here.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Server info */}
                  {serverCwd && (
                    <div className="text-xs text-muted-foreground border-b pb-4">
                      <div className="flex items-center gap-1 mb-1">
                        <Info className="w-3 h-3" />
                        Server Working Directory
                      </div>
                      <code className="text-xs break-all">{serverCwd}</code>
                    </div>
                  )}

                  {/* Backend selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor="backend"
                        className="flex items-center gap-2"
                      >
                        Backend
                        <SourceBadge source={effectiveConfig.backend.source} />
                      </Label>
                    </div>
                    <Select
                      value={getFieldValue('backend').value || 'local'}
                      onValueChange={(value) =>
                        handleFieldChange('backend', value)
                      }
                      disabled={!effectiveConfig.backend.editable}
                    >
                      <SelectTrigger
                        id="backend"
                        className={
                          !effectiveConfig.backend.editable
                            ? 'bg-muted cursor-not-allowed'
                            : ''
                        }
                      >
                        <SelectValue placeholder="Select backend" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="vercel">Vercel</SelectItem>
                        <SelectItem value="postgres">PostgreSQL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Local-specific fields */}
                  {isLocal && (
                    <>
                      <ConfigField
                        label="Port"
                        field={getFieldValue('port')}
                        envVarName="PORT"
                        placeholder="3000"
                        onChange={(v) => handleFieldChange('port', v)}
                        error={errors.port}
                      />

                      <ConfigField
                        label="Data Directory"
                        field={getFieldValue('dataDir')}
                        envVarName="WORKFLOW_LOCAL_DATA_DIR"
                        placeholder="Path to your project directory"
                        onChange={(v) => handleFieldChange('dataDir', v)}
                        error={errors.dataDir}
                        helpText="Path to your project or its workflow data directory."
                      />

                      {/* Show resolved data dir info */}
                      {dataDirInfo && (
                        <div className="text-xs border rounded-md p-3 bg-muted/50">
                          <div className="font-medium mb-2">
                            Resolved Data Directory
                          </div>
                          {dataDirInfo.projectDir && (
                            <div>
                              <span className="text-muted-foreground">
                                Project:{' '}
                              </span>
                              <code className="break-all">
                                {dataDirInfo.projectDir}
                              </code>
                            </div>
                          )}
                          {dataDirInfo.dataDir && (
                            <div>
                              <span className="text-muted-foreground">
                                Data:{' '}
                              </span>
                              <code className="break-all">
                                {dataDirInfo.dataDir}
                              </code>
                            </div>
                          )}
                          {dataDirInfo.shortName && (
                            <div>
                              <span className="text-muted-foreground">
                                Name:{' '}
                              </span>
                              <code>{dataDirInfo.shortName}</code>
                            </div>
                          )}
                        </div>
                      )}

                      <ConfigField
                        label="Manifest Path"
                        field={getFieldValue('manifestPath')}
                        envVarName="WORKFLOW_MANIFEST_PATH"
                        placeholder="app/.well-known/workflow/v1/manifest.json"
                        onChange={(v) => handleFieldChange('manifestPath', v)}
                        error={errors.manifestPath}
                        helpText="Path to the workflow manifest file for the Workflows tab."
                      />
                    </>
                  )}

                  {/* PostgreSQL-specific fields */}
                  {isPostgres && (
                    <ConfigField
                      label="Connection URL"
                      field={getFieldValue('postgresUrl')}
                      envVarName="WORKFLOW_POSTGRES_URL"
                      placeholder="postgres://user:pass@host:5432/db"
                      onChange={(v) => handleFieldChange('postgresUrl', v)}
                      error={errors.postgresUrl}
                    />
                  )}

                  {/* Vercel-specific fields */}
                  {isVercel && (
                    <>
                      <ConfigField
                        label="Environment"
                        field={getFieldValue('vercelEnv')}
                        envVarName="WORKFLOW_VERCEL_ENV"
                        placeholder="production"
                        onChange={(v) => handleFieldChange('vercelEnv', v)}
                        error={errors.vercelEnv}
                      />

                      <ConfigField
                        label="Auth Token"
                        field={getFieldValue('vercelAuthToken')}
                        envVarName="WORKFLOW_VERCEL_AUTH_TOKEN"
                        type="password"
                        placeholder="Vercel auth token"
                        onChange={(v) =>
                          handleFieldChange('vercelAuthToken', v)
                        }
                        error={errors.vercelAuthToken}
                      />

                      <ConfigField
                        label="Project ID"
                        field={getFieldValue('vercelProject')}
                        envVarName="WORKFLOW_VERCEL_PROJECT"
                        placeholder="prj_..."
                        onChange={(v) => handleFieldChange('vercelProject', v)}
                        error={errors.vercelProject}
                      />

                      <ConfigField
                        label="Team ID"
                        field={getFieldValue('vercelTeam')}
                        envVarName="WORKFLOW_VERCEL_TEAM"
                        placeholder="team_..."
                        onChange={(v) => handleFieldChange('vercelTeam', v)}
                        error={errors.vercelTeam}
                      />
                    </>
                  )}

                  {/* Error display */}
                  {Object.keys(errors).length > 0 && (
                    <Alert
                      variant="destructive"
                      className="!bg-destructive/10 !border-destructive"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Configuration Error</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {Object.entries(errors).map(([field, message]) => (
                            <li key={field} className="break-words">
                              <strong>{field}:</strong> {message}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    <Button
                      onClick={handleApply}
                      disabled={!hasChanges}
                      className="w-full"
                    >
                      Apply Configuration
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                    {mode !== 'self-hosted' && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          resetUserConfig();
                          setLocalChanges({});
                        }}
                        className="w-full text-muted-foreground"
                      >
                        Reset to Defaults
                      </Button>
                    )}
                  </div>

                  {/* Docs link */}
                  <div className="pt-4 border-t">
                    <a
                      href="https://useworkflow.dev/docs/observability"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Documentation
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
