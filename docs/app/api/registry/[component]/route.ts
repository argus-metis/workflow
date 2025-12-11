/** biome-ignore-all lint/suspicious/noConsole: "server only" */

import { promises as fs, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { track } from '@vercel/analytics/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Registry, RegistryItem } from 'shadcn/schema';
import { Project } from 'ts-morph';
import { stepsData } from '@/app/steps/steps-data';

const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
const registryUrl = `${protocol}://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;

// Directory containing step files
const stepsDir = join(process.cwd(), 'app', 'steps', 'directory');

// Base dependency for all workflow steps
const baseDependencies = ['workflow'];

// Normalize to package root (supports scoped and deep subpath imports)
const getBasePackageName = (specifier: string) => {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.slice(0, 2).join('/');
  }
  return specifier.split('/')[0];
};

// Read all step files
const stepFiles = readdirSync(stepsDir, { withFileTypes: true });
const tsFiles = stepFiles.filter(
  (file) =>
    file.isFile() && file.name.endsWith('.ts') && file.name !== 'index.ts'
);

// Load all step file contents
const files: {
  type: string;
  path: string;
  content: string;
  name: string;
}[] = [];

const fileContents = await Promise.all(
  tsFiles.map(async (tsFile) => {
    const filePath = join(stepsDir, tsFile.name);
    const content = await fs.readFile(filePath, 'utf-8');
    const stepName = tsFile.name.replace('.ts', '');

    return {
      type: 'registry:component',
      path: `registry/default/steps/${tsFile.name}`,
      content,
      name: stepName,
    };
  })
);

files.push(...fileContents);

// Create items for the root registry response
const componentItems: RegistryItem[] = tsFiles.map((componentFile) => {
  const componentName = componentFile.name.replace('.ts', '');

  // Find metadata from stepsData
  const stepMetadata = stepsData.find((step) => step.id === componentName);

  const item: RegistryItem = {
    name: componentName,
    type: 'registry:component',
    title:
      stepMetadata?.name ||
      componentName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    description:
      stepMetadata?.description || `Workflow step: ${componentName}.`,
    files: [
      {
        path: `registry/default/steps/${componentFile.name}`,
        type: 'registry:component',
        target: `lib/steps/${componentFile.name}`,
      },
    ],
  };

  return item;
});

const items: RegistryItem[] = componentItems;

const response: Registry = {
  name: 'workflow-steps',
  homepage: new URL('/steps', registryUrl).toString(),
  items,
};

type RequestProps = {
  params: Promise<{ component: string }>;
};

export const GET = async (_request: NextRequest, { params }: RequestProps) => {
  const { component } = await params;
  const parsedComponent = component.replace('.json', '');

  if (parsedComponent === 'registry') {
    try {
      track('registry:registry');
    } catch (error) {
      console.warn('Failed to track registry:registry:', error);
    }
    return NextResponse.json(response);
  }

  // Handle "all.json" - bundle all steps into a single RegistryItem
  if (parsedComponent === 'all') {
    try {
      track('registry:all');
    } catch (error) {
      console.warn('Failed to track registry:all:', error);
    }

    // Collect all dependencies from all steps
    const allDependencies = new Set<string>(baseDependencies);
    const allFiles: RegistryItem['files'] = [];

    // Process each step file
    for (const file of files) {
      allFiles.push({
        path: file.path,
        type: file.type as RegistryItem['type'],
        content: file.content,
        target: `lib/steps/${file.name}.ts`,
      });

      // Parse imports for dependencies
      const project = new Project({ useInMemoryFileSystem: true });
      try {
        const sourceFile = project.createSourceFile(file.path, file.content);
        const imports = sourceFile
          .getImportDeclarations()
          .map((d) => d.getModuleSpecifierValue());

        for (const moduleName of imports) {
          if (!moduleName) {
            continue;
          }

          // Skip relative imports and workflow package (already in base)
          if (moduleName.startsWith('.') || moduleName === 'workflow') {
            continue;
          }

          const pkg = getBasePackageName(moduleName);
          // Add external npm packages
          if (!pkg.startsWith('@/')) {
            allDependencies.add(pkg);
          }
        }
      } catch (error) {
        console.warn(`Failed to parse imports for ${file.path}:`, error);
      }
    }

    const allStepsItem: RegistryItem = {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      name: 'all',
      type: 'registry:component',
      title: 'All Workflow Steps',
      description: 'Bundle containing all workflow steps.',
      files: allFiles,
      dependencies: Array.from(allDependencies),
      registryDependencies: [],
    };

    return NextResponse.json(allStepsItem);
  }

  try {
    track(`registry:${parsedComponent}`);
  } catch (error) {
    console.warn(`Failed to track ${parsedComponent}:`, error);
  }

  // Find the item for the requested step
  const item = response.items.find((i) => i.name === parsedComponent);

  if (!item) {
    return NextResponse.json(
      { error: `Step "${parsedComponent}" not found.` },
      { status: 404 }
    );
  }

  // Find the corresponding file content
  const file = files.find((f) => f.name === parsedComponent);

  if (!file) {
    return NextResponse.json(
      { error: `File for "${parsedComponent}" not found.` },
      { status: 404 }
    );
  }

  // Parse imports for the single step to determine actual dependencies
  const usedDependencies = new Set<string>(baseDependencies);
  const usedRegistryDependencies = new Set<string>();

  const project = new Project({ useInMemoryFileSystem: true });

  try {
    const sourceFile = project.createSourceFile(file.path, file.content);
    const imports = sourceFile
      .getImportDeclarations()
      .map((d) => d.getModuleSpecifierValue());

    for (const moduleName of imports) {
      if (!moduleName) {
        continue;
      }

      // Skip relative imports and workflow package (already in base)
      if (moduleName.startsWith('.') || moduleName === 'workflow') {
        continue;
      }

      const pkg = getBasePackageName(moduleName);
      // Add external npm packages
      if (!pkg.startsWith('@/')) {
        usedDependencies.add(pkg);
      }

      // Check if it's a registry dependency (other steps)
      if (moduleName.startsWith('@/lib/steps/')) {
        const stepName = moduleName.split('/').pop()?.replace('.ts', '');
        if (stepName) {
          usedRegistryDependencies.add(stepName);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to parse imports for ${file.path}:`, error);
  }

  const itemResponse: RegistryItem = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    files: [
      {
        path: file.path,
        type: file.type as RegistryItem['type'],
        content: file.content,
        target: `lib/steps/${item.name}.ts`,
      },
    ],
    dependencies: Array.from(usedDependencies),
    registryDependencies: Array.from(usedRegistryDependencies),
  };

  return NextResponse.json(itemResponse);
};
