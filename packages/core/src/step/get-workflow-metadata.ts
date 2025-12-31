import * as Logger from '../prettylogger.js';
import type { WorkflowMetadata } from '../workflow/get-workflow-metadata.js';
import { contextStorage } from './context-storage.js';

export type { WorkflowMetadata };

/**
 * Returns metadata available in the current workflow run inside a step function.
 */
export function getWorkflowMetadata(): WorkflowMetadata {
  const ctx = contextStorage.getStore();
  if (!ctx) {
    throw new Error(
      Logger.frame(
        '`getWorkflowMetadata()` can only be called inside a workflow or step function',
        [
          Logger.help([
            'This function comes from Workflow DevKit, and requires to be used as a part of a workflow or a step,',
            'As it has no meaning outside of the workflow context.',
            'Read more: https://useworkflow.dev/docs/api-reference/workflow/get-workflow-metadata',
          ]),
        ]
      )
    );
  }
  return ctx.workflowMetadata;
}
