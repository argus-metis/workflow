'use client';

import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from '@/components/geistdocs/code-block-tabs';

interface CodeExampleProps {
  codeHtml: string;
  stepId: string;
}

export function CodeExample({ codeHtml, stepId }: CodeExampleProps) {
  const stepPath = `@/lib/steps/${stepId}`;

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Code</h2>
      <CodeBlockTabs defaultValue="code">
        <CodeBlockTabsList>
          <CodeBlockTabsTrigger value="code">{stepPath}</CodeBlockTabsTrigger>
          <CodeBlockTabsTrigger value="usage">Usage</CodeBlockTabsTrigger>
        </CodeBlockTabsList>
        <CodeBlockTab value="code">
          <div
            className="overflow-auto text-sm py-6 [&_pre]:!bg-transparent [&_pre]:m-0"
            dangerouslySetInnerHTML={{ __html: codeHtml }}
          />
        </CodeBlockTab>
        <CodeBlockTab value="usage">
          <div className="p-8 text-center text-sm text-muted-foreground">
            Usage examples coming soon...
          </div>
        </CodeBlockTab>
      </CodeBlockTabs>
    </div>
  );
}
