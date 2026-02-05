import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { World } from '@workflow/world';
import { createLocalWorld } from '@workflow/world-local';
import { createVercelWorld } from '@workflow/world-vercel';

const WorldCache = Symbol.for('@workflow/world//cache');
const StubbedWorldCache = Symbol.for('@workflow/world//stubbedCache');

const globalSymbols: typeof globalThis & {
  [WorldCache]?: World;
  [StubbedWorldCache]?: World;
} = globalThis;

function defaultWorld(): 'vercel' | 'local' {
  if (process.env.VERCEL_DEPLOYMENT_ID) {
    return 'vercel';
  }

  return 'local';
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<any>;

function resolveModulePath(specifier: string): string {
  if (
    specifier.startsWith('file://') ||
    specifier.startsWith('/') ||
    specifier.startsWith('./') ||
    specifier.startsWith('../')
  ) {
    return specifier;
  }
  try {
    const require = createRequire(
      pathToFileURL(process.cwd() + '/package.json').href
    );
    return pathToFileURL(require.resolve(specifier)).href;
  } catch {
    return specifier;
  }
}

/**
 * Create a new world instance based on environment variables.
 * WORKFLOW_TARGET_WORLD is used to determine the target world.
 * All other environment variables are specific to the target world
 */
export const createWorld = async (): Promise<World> => {
  const targetWorld = process.env.WORKFLOW_TARGET_WORLD || defaultWorld();

  if (targetWorld === 'vercel') {
    return createVercelWorld({
      token: process.env.WORKFLOW_VERCEL_AUTH_TOKEN,
      projectConfig: {
        environment: process.env.WORKFLOW_VERCEL_ENV,
        projectId: process.env.WORKFLOW_VERCEL_PROJECT,
        teamId: process.env.WORKFLOW_VERCEL_TEAM,
      },
    });
  }

  if (targetWorld === 'local') {
    return createLocalWorld({
      dataDir: process.env.WORKFLOW_LOCAL_DATA_DIR,
    });
  }

  const resolvedPath = resolveModulePath(targetWorld);
  const mod = await dynamicImport(resolvedPath);
  if (typeof mod === 'function') {
    return mod() as World;
  } else if (typeof mod.default === 'function') {
    return mod.default() as World;
  } else if (typeof mod.createWorld === 'function') {
    return mod.createWorld() as World;
  }

  throw new Error(
    `Invalid target world module: ${targetWorld}, must export a default function or createWorld function that returns a World instance.`
  );
};

export type WorldHandlers = Pick<World, 'createQueueHandler'>;

/**
 * Some functions from the world are needed at build time, but we do NOT want
 * to cache the world in those instances for general use, since we don't have
 * the correct environment variables set yet. This is a safe function to
 * call at build time, that only gives access to non-environment-bound world
 * functions. The only binding value should be the target world.
 * Once we migrate to a file-based configuration (workflow.config.ts), we should
 * be able to re-combine getWorld and getWorldHandlers into one singleton.
 */
export const getWorldHandlers = async (): Promise<WorldHandlers> => {
  if (globalSymbols[StubbedWorldCache]) {
    return globalSymbols[StubbedWorldCache];
  }
  const _world = await createWorld();
  globalSymbols[StubbedWorldCache] = _world;
  return {
    createQueueHandler: _world.createQueueHandler,
  };
};

export const getWorld = async (): Promise<World> => {
  if (globalSymbols[WorldCache]) {
    return globalSymbols[WorldCache];
  }
  globalSymbols[WorldCache] = await createWorld();
  return Promise.resolve(globalSymbols[WorldCache]);
};

/**
 * Reset the cached world instance. This should be called when environment
 * variables change and you need to reinitialize the world with new config.
 */
export const setWorld = (world: World | undefined): void => {
  globalSymbols[WorldCache] = world;
  globalSymbols[StubbedWorldCache] = world;
};
