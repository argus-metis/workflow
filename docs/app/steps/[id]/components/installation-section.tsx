'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Installer } from '@/components/geistdocs/installer';

interface InstallationSectionProps {
  stepId: string;
}

export function InstallationSection({ stepId }: InstallationSectionProps) {
  const commands = {
    npm: `npx shadcn@latest add @workflow/${stepId}`,
    pnpm: `pnpm dlx shadcn@latest add @workflow/${stepId}`,
    yarn: `npx shadcn@latest add @workflow/${stepId}`,
    bun: `bunx shadcn@latest add @workflow/${stepId}`,
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Installation</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Run the following command to install{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
          {stepId}.tsx
        </code>
      </p>
      <Tabs defaultValue="npm" className="w-full">
        <TabsList>
          <TabsTrigger value="npm">npm</TabsTrigger>
          <TabsTrigger value="pnpm">pnpm</TabsTrigger>
          <TabsTrigger value="yarn">yarn</TabsTrigger>
          <TabsTrigger value="bun">bun</TabsTrigger>
        </TabsList>
        <TabsContent value="npm" className="mt-4">
          <Installer command={commands.npm} />
        </TabsContent>
        <TabsContent value="pnpm" className="mt-4">
          <Installer command={commands.pnpm} />
        </TabsContent>
        <TabsContent value="yarn" className="mt-4">
          <Installer command={commands.yarn} />
        </TabsContent>
        <TabsContent value="bun" className="mt-4">
          <Installer command={commands.bun} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
