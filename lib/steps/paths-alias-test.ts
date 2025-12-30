/**
 * This is a step function from outside the workbench app directory.
 * It is used to test that esbuild can resolve tsconfig path aliases.
 */
export async function pathsAliasStep(): Promise<string> {
  'use step';
  return 'pathsAliasStep';
}
