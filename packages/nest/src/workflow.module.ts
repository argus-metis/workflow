import {
  type DynamicModule,
  Module,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { LocalBuilder } from './builder.js';
import { WorkflowController } from './workflow.controller.js';
import { createBuildQueue } from '@workflow/builders';

const enqueue = createBuildQueue();
const localBuilder = new LocalBuilder();

@Module({})
export class WorkflowModule implements OnModuleInit, OnModuleDestroy {
  static forRoot(): DynamicModule {
    return {
      module: WorkflowModule,
      controllers: [WorkflowController],
      providers: [{ provide: 'WORKFLOW_OPTIONS', useValue: {} }],
      global: true,
    };
  }

  async onModuleInit() {
    await enqueue(() => localBuilder.build());
  }

  async onModuleDestroy() {
    // Cleanup if needed
  }
}
