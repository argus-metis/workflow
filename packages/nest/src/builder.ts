import {
  BaseBuilder,
  createBaseBuilderConfig,
  VercelBuildOutputAPIBuilder,
} from '@workflow/builders';
import { join } from 'pathe';
import { mkdir, writeFile } from 'node:fs/promises';

export class LocalBuilder extends BaseBuilder {
  #outDir: string;

  constructor() {
    const workingDir = process.cwd();
    const outDir = join(workingDir, '.nestjs/workflow');
    super({
      ...createBaseBuilderConfig({
        workingDir: workingDir,
        dirs: ['src'],
      }),
      buildTarget: 'nest',
    });
    this.#outDir = outDir;
  }

  async build() {
    const inputFiles = await this.getInputFiles();
    await mkdir(this.#outDir, { recursive: true });

    await this.createWorkflowsBundle({
      outfile: join(this.#outDir, 'workflows.mjs'),
      bundleFinalOutput: false,
      format: 'esm',
      inputFiles,
    });

    await this.createStepsBundle({
      outfile: join(this.#outDir, 'steps.mjs'),
      externalizeNonSteps: true,
      format: 'esm',
      inputFiles,
    });

    await this.createWebhookBundle({
      outfile: join(this.#outDir, 'webhook.mjs'),
      bundle: false,
    });

    if (process.env.VERCEL_DEPLOYMENT_ID === undefined) {
      await writeFile(join(this.#outDir, '.gitignore'), '*');
    }
  }
}

export class VercelBuilder extends VercelBuildOutputAPIBuilder {
  constructor() {
    super({
      ...createBaseBuilderConfig({
        workingDir: process.cwd(),
        dirs: ['src'],
      }),
      buildTarget: 'vercel-build-output-api',
    });
  }
  override async build(): Promise<void> {
    // const configPath = join(
    //   this.config.workingDir,
    //   ".vercel/output/config.json",
    // );
    // const originalConfig = JSON.parse(await readFile(configPath, "utf-8"));
    await super.build();
    // const newConfig = JSON.parse(await readFile(configPath, "utf-8"));
    // originalConfig.routes.unshift(...newConfig.routes);
    // await writeFile(configPath, JSON.stringify(originalConfig, null, 2));
  }
}
