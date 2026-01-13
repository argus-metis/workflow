'use client';

import {
  ENV_VAR_META,
  getEnvVarMeta,
  getWorldById,
  isLocalWorld,
  worldsManifest,
  type Project,
} from '@workflow/utils';
import {
  findWorkflowDataDir,
  type WorkflowDataDirInfo,
} from '@workflow/utils/check-data-dir';
import { validateProjectConfig } from '@workflow/web-shared/server';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProject } from '@/lib/project-context';

/**
 * Configuration form for creating/editing a project.
 */
function ProjectConfigForm({
  initialProject,
  onSave,
  onCancel,
  isEditing = false,
}: {
  initialProject?: Project | null;
  onSave: (project: Omit<Project, 'id' | 'createdAt' | 'lastUsedAt'>) => void;
  onCancel: () => void;
  isEditing?: boolean;
}) {
  const [worldId, setWorldId] = useState(initialProject?.worldId || 'local');
  const [envMap, setEnvMap] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialProject?.envMap || {}).map(([k, v]) => [k, v || ''])
    )
  );
  const [projectDir, setProjectDir] = useState(
    initialProject?.projectDir || './'
  );
  const [name, setName] = useState(initialProject?.name || '');
  const [customEnvKey, setCustomEnvKey] = useState('');
  const [customEnvValue, setCustomEnvValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get world definition
  const world = getWorldById(worldId);
  const isKnownWorld = !!world;
  const isLocal = isLocalWorld(worldId);

  // Inline validation for local world data directory
  const { data: dataDirInfo, isLoading: isValidatingDataDir } =
    useSWR<WorkflowDataDirInfo | null>(
      isLocal && (envMap.WORKFLOW_LOCAL_DATA_DIR || projectDir)
        ? `validate-datadir:${envMap.WORKFLOW_LOCAL_DATA_DIR || projectDir}`
        : null,
      async () => {
        const dataDir = envMap.WORKFLOW_LOCAL_DATA_DIR || projectDir;
        return findWorkflowDataDir(dataDir);
      },
      { revalidateOnFocus: false }
    );

  // Handle world change
  const handleWorldChange = (newWorldId: string) => {
    setWorldId(newWorldId);
    // Reset env map but keep project dir
    setEnvMap({});
    setValidationErrors([]);
  };

  // Handle env var change
  const handleEnvChange = (key: string, value: string) => {
    setEnvMap((prev) => ({ ...prev, [key]: value }));
    setValidationErrors([]);
  };

  // Add custom env var
  const handleAddCustomEnv = () => {
    if (customEnvKey && !envMap[customEnvKey]) {
      setEnvMap((prev) => ({ ...prev, [customEnvKey]: customEnvValue }));
      setCustomEnvKey('');
      setCustomEnvValue('');
    }
  };

  // Remove env var
  const handleRemoveEnv = (key: string) => {
    setEnvMap((prev) => {
      const newMap = { ...prev };
      delete newMap[key];
      return newMap;
    });
  };

  // Validate and save
  const handleSave = async () => {
    setIsValidating(true);
    setValidationErrors([]);

    try {
      // Create a temporary project for validation
      const tempProject: Project = {
        id: initialProject?.id || 'temp',
        name:
          name ||
          projectDir.split('/').filter(Boolean).slice(-2).join('/') ||
          'Untitled',
        worldId,
        envMap,
        projectDir,
        createdAt: initialProject?.createdAt || Date.now(),
        lastUsedAt: Date.now(),
      };

      const result = await validateProjectConfig(tempProject);

      if (!result.success) {
        setValidationErrors(['Failed to validate configuration']);
        return;
      }

      if (!result.data.valid) {
        setValidationErrors(
          result.data.errors.map((e) => `${e.field}: ${e.message}`)
        );
        return;
      }

      onSave({
        name:
          name ||
          projectDir.split('/').filter(Boolean).slice(-2).join('/') ||
          'Untitled',
        worldId,
        envMap,
        projectDir,
      });
    } catch (error) {
      setValidationErrors([
        error instanceof Error ? error.message : 'Validation failed',
      ]);
    } finally {
      setIsValidating(false);
    }
  };

  // Render env var fields for known worlds
  const renderKnownWorldFields = () => {
    if (!world) return null;

    const allEnvVars = [...world.requiredEnv, ...world.optionalEnv];

    return (
      <div className="space-y-4">
        {allEnvVars.map((envVar) => {
          const meta = getEnvVarMeta(envVar);
          const isRequired = world.requiredEnv.includes(envVar);
          const value = envMap[envVar] || '';

          return (
            <div key={envVar} className="space-y-2">
              <Label htmlFor={envVar}>
                {meta.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={envVar}
                type={meta.sensitive ? 'password' : 'text'}
                value={value}
                onChange={(e) => handleEnvChange(envVar, e.target.value)}
                placeholder={meta.placeholder}
              />
              <p className="text-xs text-muted-foreground">
                {meta.description}
              </p>
            </div>
          );
        })}

        {/* Special handling for local world - show data dir status */}
        {isLocal && (
          <div className="p-3 rounded-md bg-muted/50">
            {isValidatingDataDir ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking data directory...</span>
              </div>
            ) : dataDirInfo?.error ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{dataDirInfo.error}</span>
              </div>
            ) : dataDirInfo?.dataDir ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Found workflow data at: {dataDirInfo.shortName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span>
                  No workflow data found yet. Run a workflow to create it.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render generic env var fields for unknown worlds
  const renderUnknownWorldFields = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          This world is not in the known worlds list. Add environment variables
          manually.
        </div>

        {Object.entries(envMap).map(([key, value]) => (
          <div key={key} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>{key}</Label>
              <Input
                value={value}
                onChange={(e) => handleEnvChange(key, e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveEnv(key)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label>Variable Name</Label>
            <Input
              value={customEnvKey}
              onChange={(e) => setCustomEnvKey(e.target.value)}
              placeholder="VARIABLE_NAME"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>Value</Label>
            <Input
              value={customEnvValue}
              onChange={(e) => setCustomEnvValue(e.target.value)}
              placeholder="value"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleAddCustomEnv}
            disabled={!customEnvKey}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Project Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Project Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Project"
        />
        <p className="text-xs text-muted-foreground">
          A friendly name for this configuration
        </p>
      </div>

      {/* World Selection */}
      <div className="space-y-2">
        <Label htmlFor="world">World</Label>
        <Select value={worldId} onValueChange={handleWorldChange}>
          <SelectTrigger id="world">
            <SelectValue placeholder="Select a world" />
          </SelectTrigger>
          <SelectContent>
            {worldsManifest.worlds.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                <div className="flex items-center gap-2">
                  <span>{w.name}</span>
                  {w.type === 'community' && (
                    <span className="text-xs text-muted-foreground">
                      (community)
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
            <SelectItem value="custom">
              <span className="text-muted-foreground">Custom world...</span>
            </SelectItem>
          </SelectContent>
        </Select>
        {world && (
          <p className="text-xs text-muted-foreground">{world.description}</p>
        )}
      </div>

      {/* Custom world input */}
      {worldId === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="customWorld">World Package Name</Label>
          <Input
            id="customWorld"
            value={worldId === 'custom' ? '' : worldId}
            onChange={(e) => setWorldId(e.target.value)}
            placeholder="@my-org/my-world"
          />
        </div>
      )}

      {/* Project Directory */}
      <div className="space-y-2">
        <Label htmlFor="projectDir">Project Directory</Label>
        <Input
          id="projectDir"
          value={projectDir}
          onChange={(e) => setProjectDir(e.target.value)}
          placeholder="./"
        />
        <p className="text-xs text-muted-foreground">
          {isLocal
            ? 'The directory containing your project. Used to find workflow data.'
            : 'Optional: Associate this configuration with a source folder for debugging.'}
        </p>
      </div>

      {/* World-specific fields */}
      {isKnownWorld && worldId !== 'custom'
        ? renderKnownWorldFields()
        : renderUnknownWorldFields()}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isValidating}>
          {isValidating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Recent projects list.
 */
function RecentProjectsList({
  projects,
  currentProjectId,
  onSelect,
  onDelete,
}: {
  projects: Project[];
  currentProjectId: string | undefined;
  onSelect: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No recent projects</p>
        <p className="text-sm mt-2">Create a new project to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => {
        const world = getWorldById(project.worldId);
        const isActive = project.id === currentProjectId;

        return (
          <div
            key={project.id}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              isActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            }`}
            onClick={() => onSelect(project.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{project.name}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {world?.name || project.worldId}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last used: {new Date(project.lastUsedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Settings page with two-pane layout.
 */
export default function SettingsPage() {
  const router = useRouter();
  const {
    currentProject,
    projectHistory,
    switchToProject,
    deleteProject,
    createNewProject,
    setCurrentProject,
    isSelfHosting,
  } = useProject();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // In self-hosting mode, redirect to home
  useEffect(() => {
    if (isSelfHosting) {
      router.replace('/');
    }
  }, [isSelfHosting, router]);

  const handleSelectProject = (projectId: string) => {
    setIsCreatingNew(false);
    setEditingProject(null);
    switchToProject(projectId);
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setEditingProject(null);
  };

  const handleEditCurrent = () => {
    setIsCreatingNew(false);
    setEditingProject(currentProject);
  };

  const handleSaveProject = (
    projectData: Omit<Project, 'id' | 'createdAt' | 'lastUsedAt'>
  ) => {
    if (editingProject) {
      // Update existing project
      const updatedProject: Project = {
        ...editingProject,
        ...projectData,
        lastUsedAt: Date.now(),
      };
      setCurrentProject(updatedProject);
      setEditingProject(null);
    } else {
      // Create new project
      createNewProject(projectData);
      setIsCreatingNew(false);
    }
  };

  const handleCancel = () => {
    setIsCreatingNew(false);
    setEditingProject(null);
  };

  const handleGoBack = () => {
    router.push('/');
  };

  if (isSelfHosting) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Project Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left pane - Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Select a project to view or switch to it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentProjectsList
              projects={projectHistory}
              currentProjectId={currentProject?.id}
              onSelect={handleSelectProject}
              onDelete={deleteProject}
            />
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleCreateNew}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </CardContent>
        </Card>

        {/* Right pane - Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreatingNew
                ? 'New Project'
                : editingProject
                  ? 'Edit Project'
                  : 'Current Project'}
            </CardTitle>
            <CardDescription>
              {isCreatingNew
                ? 'Configure a new project connection'
                : editingProject
                  ? 'Update project configuration'
                  : 'View or edit your current project settings'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCreatingNew || editingProject ? (
              <ProjectConfigForm
                initialProject={editingProject}
                onSave={handleSaveProject}
                onCancel={handleCancel}
                isEditing={!!editingProject}
              />
            ) : currentProject ? (
              <div className="space-y-6">
                <ProjectConfigForm
                  initialProject={currentProject}
                  onSave={handleSaveProject}
                  onCancel={handleCancel}
                  isEditing={true}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No project selected</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleCreateNew}
                >
                  Create New Project
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
