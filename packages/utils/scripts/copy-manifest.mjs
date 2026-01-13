#!/usr/bin/env node
/**
 * Copies worlds-manifest.json from the repo root into the utils src folder.
 * This ensures the CLI and web app releases are bound to a specific version of the manifest.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const repoRoot = resolve(packageRoot, '../..');

const srcPath = join(repoRoot, 'worlds-manifest.json');
const destPath = join(packageRoot, 'src', 'worlds-manifest.json');

if (!existsSync(srcPath)) {
  console.error(`Error: worlds-manifest.json not found at ${srcPath}`);
  process.exit(1);
}

try {
  copyFileSync(srcPath, destPath);
  console.log(`Copied worlds-manifest.json to ${destPath}`);
} catch (error) {
  console.error(`Error copying worlds-manifest.json: ${error.message}`);
  process.exit(1);
}
