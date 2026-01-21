import fs from 'node:fs';
import { serve, type ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { start } from 'workflow/api';
import { setWorld } from 'workflow/runtime';
import { createLocalWorld } from '@workflow/world-local';

// Dynamic imports for compiled workflow bundles
let flow: { POST: (req: Request) => Promise<Response> };
let step: { POST: (req: Request) => Promise<Response> };
let manifest: {
  workflows: Record<string, Record<string, { workflowId: string }>>;
};

export interface TestServer {
  port: number;
  baseUrl: string;
  close: () => Promise<void>;
  invoke: (
    workflow: { workflowId: string },
    args: unknown[]
  ) => Promise<{ runId: string }>;
  waitForCompletion: (
    runId: string,
    timeout?: number
  ) => Promise<{ status: string; output?: unknown; error?: unknown }>;
}

export async function startTestServer(): Promise<TestServer> {
  // Load compiled workflow bundles
  try {
    flow = await import('../.well-known/workflow/v1/flow.js');
    step = await import('../.well-known/workflow/v1/step.js');
    manifest = (
      await import('../.well-known/workflow/v1/manifest.json', {
        with: { type: 'json' },
      })
    ).default;
  } catch (err) {
    throw new Error(
      `Failed to load workflow bundles. Did you run 'pnpm build' first?\n${err}`
    );
  }

  // Create a temporary data directory for this test run
  const dataDir = `.workflow-test-data-${Date.now()}`;

  // Set up local world with test-specific data directory
  const world = createLocalWorld({ dataDir });
  setWorld(world);

  // Initialize the world
  await world.start?.();

  const app = new Hono()
    .post('/.well-known/workflow/v1/flow', (ctx) => {
      return flow.POST(ctx.req.raw);
    })
    .post('/.well-known/workflow/v1/step', (ctx) => {
      return step.POST(ctx.req.raw);
    })
    .get('/runs/:runId', async (ctx) => {
      const run = await world.runs.get(ctx.req.param('runId'));
      return ctx.json(run);
    });

  return new Promise((resolve) => {
    const server: ServerType = serve(
      { fetch: app.fetch, port: 0 },
      async (info) => {
        const port = info.port;
        const baseUrl = `http://localhost:${port}`;

        // Update world config with the actual port
        setWorld(createLocalWorld({ dataDir, port, baseUrl }));

        resolve({
          port,
          baseUrl,
          close: async () => {
            server.close();
            setWorld(undefined);
            // Clean up test data directory
            try {
              fs.rmSync(dataDir, { recursive: true, force: true });
            } catch {}
          },
          invoke: async (workflow, args) => {
            const run = await start(workflow, args);
            return { runId: run.runId };
          },
          waitForCompletion: async (runId, timeout = 10000) => {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
              const run = await world.runs.get(runId);
              if (
                run.status === 'completed' ||
                run.status === 'failed' ||
                run.status === 'cancelled'
              ) {
                return {
                  status: run.status,
                  output: run.output,
                  error: run.error,
                };
              }
              await new Promise((r) => setTimeout(r, 100));
            }
            throw new Error(`Timeout waiting for run ${runId} to complete`);
          },
        });
      }
    );
  });
}
