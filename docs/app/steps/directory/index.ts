import { promises as fs } from 'fs';
import path from 'path';

/**
 * Load step code by step ID
 * @param stepId - The step ID (e.g., "slack-message", "send-email")
 * @returns The TypeScript code as a string
 */
export async function loadStepCode(stepId: string): Promise<string> {
  try {
    const filePath = path.join(
      process.cwd(),
      'app',
      'steps',
      'directory',
      `${stepId}.ts`
    );
    const code = await fs.readFile(filePath, 'utf-8');
    return code;
  } catch (error) {
    // Return a default template if file doesn't exist
    return `import { FatalError } from 'workflow';

/**
 * ${stepId} step
 * 
 * TODO: Implement this step
 */
export async function ${toCamelCase(stepId)}() {
  'use step';
  
  throw new FatalError('Not implemented');
}`;
  }
}

/**
 * Convert kebab-case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Get all available step IDs
 */
export async function getAvailableStepIds(): Promise<string[]> {
  try {
    const dirPath = path.join(process.cwd(), 'app', 'steps', 'directory');
    const files = await fs.readdir(dirPath);
    return files
      .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
      .map((file) => file.replace('.ts', ''));
  } catch (error) {
    return [];
  }
}
