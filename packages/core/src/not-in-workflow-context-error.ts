import { ansifyStep } from './parse-name.js';
import * as Logger from './prettylogger.js';
import { getWorkflowMetadata } from './workflow/get-workflow-metadata.js';

export class NotInWorkflowContextError extends Error {
  name = 'NotInWorkflowContextError';
  constructor(
    readonly functionName: string,
    docLink: `${string}: https://${string}`
  ) {
    super(
      Logger.frame(
        `\`${functionName}\` can only be called inside a workflow function`,
        [Logger.note(`Read more about ${docLink}`)]
      )
    );
  }
}

export class NotInStepContextError extends Error {
  name = 'NotInStepContextError';
  constructor(
    readonly functionName: string,
    docLink: `${string}: https://${string}`
  ) {
    super(
      Logger.frame(
        `\`${functionName}\` can only be called inside a step function`,
        [Logger.note(`Read more about ${docLink}`)]
      )
    );
  }
}

export class UnavailableInWorkflowContextError extends Error {
  name = 'UnavailableInWorkflowContextError';
  constructor(
    readonly functionName: string,
    docLink: `${string}: https://${string}`
  ) {
    const { workflowName } = getWorkflowMetadata();
    const message = Logger.frame(
      `\`${functionName}\` cannot be called from a workflow context.`,
      [
        Logger.note([
          `this call was made from the ${ansifyStep(workflowName)} workflow context.`,
          `Read more about ${docLink}`,
        ]),
      ]
    );
    super(message);
  }
}
