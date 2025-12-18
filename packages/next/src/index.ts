import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';
import semver from 'semver';
import { getNextBuilder } from './builder.js';

/**
 * Next.js rewrite rule type
 */
interface Rewrite {
  source: string;
  destination: string;
  basePath?: false;
  locale?: false;
  has?: Array<{ type: string; key?: string; value?: string }>;
  missing?: Array<{ type: string; key?: string; value?: string }>;
}

/**
 * Check if Pages Router exists in the project.
 */
function hasPagesRouter(): boolean {
  const cwd = process.cwd();
  return (
    existsSync(resolve(cwd, 'pages')) || existsSync(resolve(cwd, 'src/pages'))
  );
}

/**
 * The rewrite rule for Pages Router to map workflow protocol routes
 * from /.well-known/workflow/v1/* to /api/.well-known/workflow/v1/*
 */
const PAGES_ROUTER_WORKFLOW_REWRITE: Rewrite = {
  source: '/.well-known/workflow/v1/:path*',
  destination: '/api/.well-known/workflow/v1/:path*',
};

export function withWorkflow(
  nextConfigOrFn:
    | NextConfig
    | ((
        phase: string,
        ctx: { defaultConfig: NextConfig }
      ) => Promise<NextConfig>),
  {
    workflows,
  }: {
    workflows?: {
      local?: {
        port?: number;
        dataDir?: string;
      };
    };
  } = {}
) {
  if (!process.env.VERCEL_DEPLOYMENT_ID) {
    if (!process.env.WORKFLOW_TARGET_WORLD) {
      process.env.WORKFLOW_TARGET_WORLD = 'local';
      process.env.WORKFLOW_LOCAL_DATA_DIR = '.next/workflow-data';
    }
    const maybePort = workflows?.local?.port;
    if (maybePort) {
      process.env.PORT = maybePort.toString();
    }
  } else {
    if (!process.env.WORKFLOW_TARGET_WORLD) {
      process.env.WORKFLOW_TARGET_WORLD = 'vercel';
    }
  }

  return async function buildConfig(
    phase: string,
    ctx: { defaultConfig: NextConfig }
  ) {
    const loaderPath = require.resolve('./loader');

    let nextConfig: NextConfig;

    if (typeof nextConfigOrFn === 'function') {
      nextConfig = await nextConfigOrFn(phase, ctx);
    } else {
      nextConfig = nextConfigOrFn;
    }
    // shallow clone to avoid read-only on top-level
    nextConfig = Object.assign({}, nextConfig);

    // configure the loader if turbopack is being used
    if (!nextConfig.turbopack) {
      nextConfig.turbopack = {};
    }
    if (!nextConfig.turbopack.rules) {
      nextConfig.turbopack.rules = {};
    }
    const existingRules = nextConfig.turbopack.rules as any;
    const nextVersion = require('next/package.json').version;
    const supportsTurboCondition = semver.gte(nextVersion, 'v16.0.0');

    for (const key of [
      '*.tsx',
      '*.ts',
      '*.jsx',
      '*.js',
      '*.mjs',
      '*.mts',
      '*.cjs',
      '*.cts',
    ]) {
      nextConfig.turbopack.rules[key] = {
        ...(supportsTurboCondition
          ? {
              condition: {
                ...existingRules[key]?.condition,
                any: [
                  ...(existingRules[key]?.condition.any || []),
                  {
                    content: /(use workflow|use step)/,
                  },
                ],
              },
            }
          : {}),
        loaders: [...(existingRules[key]?.loaders || []), loaderPath],
      };
    }

    // configure the loader for webpack
    const existingWebpackModify = nextConfig.webpack;
    nextConfig.webpack = (...args) => {
      const [webpackConfig] = args;
      if (!webpackConfig.module) {
        webpackConfig.module = {};
      }
      if (!webpackConfig.module.rules) {
        webpackConfig.module.rules = [];
      }
      // loaders in webpack apply bottom->up so ensure
      // ours comes before the default swc transform
      webpackConfig.module.rules.push({
        test: /.*\.(mjs|cjs|cts|ts|tsx|js|jsx)$/,
        loader: loaderPath,
      });

      return existingWebpackModify
        ? existingWebpackModify(...args)
        : webpackConfig;
    };
    // only run this in the main process so it only runs once
    // as Next.js uses child processes for different builds
    if (
      !process.env.WORKFLOW_NEXT_PRIVATE_BUILT &&
      phase !== 'phase-production-server'
    ) {
      const shouldWatch = process.env.NODE_ENV === 'development';
      const NextBuilder = await getNextBuilder();
      const workflowBuilder = new NextBuilder({
        watch: shouldWatch,
        // discover workflows from pages/app entries
        dirs: ['pages', 'app', 'src/pages', 'src/app'],
        workingDir: process.cwd(),
        buildTarget: 'next',
        workflowsBundlePath: '', // not used in base
        stepsBundlePath: '', // not used in base
        webhookBundlePath: '', // node used in base
        externalPackages: [...(nextConfig.serverExternalPackages || [])],
      });

      await workflowBuilder.build();
      process.env.WORKFLOW_NEXT_PRIVATE_BUILT = '1';
    }

    // For Pages Router, add rewrites to map /.well-known/workflow/v1/* to /api/.well-known/workflow/v1/*
    // This is needed because Pages Router API routes must be in /pages/api/
    if (hasPagesRouter()) {
      const existingRewrites = nextConfig.rewrites;
      nextConfig.rewrites = (async () => {
        // Get existing rewrites if any
        let existing: any = [];
        if (typeof existingRewrites === 'function') {
          existing = await existingRewrites();
        } else if (existingRewrites) {
          existing = existingRewrites;
        }

        // Handle both array format and object format (beforeFiles/afterFiles/fallback)
        if (Array.isArray(existing)) {
          return [...existing, PAGES_ROUTER_WORKFLOW_REWRITE];
        } else {
          return {
            beforeFiles: existing.beforeFiles || [],
            afterFiles: [
              ...(existing.afterFiles || []),
              PAGES_ROUTER_WORKFLOW_REWRITE,
            ],
            fallback: existing.fallback || [],
          };
        }
      }) as any;
    }

    return nextConfig;
  };
}
