#!/usr/bin/env node
/**
 * Generates worlds-manifest data from the repo root JSON file.
 * This ensures the CLI and web app releases are bound to a specific version of the manifest.
 *
 * The generated file contains only the manifest data as a TypeScript constant,
 * which is then re-exported by worlds-manifest.ts alongside types and utilities.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const repoRoot = resolve(packageRoot, '../..');

const srcPath = join(repoRoot, 'worlds-manifest.json');
const destPath = join(packageRoot, 'src', 'worlds-manifest-data.generated.ts');

if (!existsSync(srcPath)) {
  console.error(`Error: worlds-manifest.json not found at ${srcPath}`);
  process.exit(1);
}

try {
  const manifestJson = readFileSync(srcPath, 'utf-8');
  const manifest = JSON.parse(manifestJson);

  // Generate TypeScript file with the manifest data
  const tsContent = `// AUTO-GENERATED FILE - DO NOT EDIT
// Generated from worlds-manifest.json by scripts/copy-manifest.mjs
// Run \`pnpm build\` in packages/utils to regenerate

import type { WorldsManifest } from './worlds-manifest.js';

/**
 * The loaded worlds manifest data.
 * This data is generated from worlds-manifest.json during the build process.
 */
export const worldsManifestData: WorldsManifest = ${JSON.stringify(manifest, null, 2)} as const;
`;

  writeFileSync(destPath, tsContent, 'utf-8');
  console.log(
    `Generated worlds-manifest-data.generated.ts from worlds-manifest.json`
  );
} catch (error) {
  console.error(`Error generating worlds manifest: ${error.message}`);
  process.exit(1);
}
