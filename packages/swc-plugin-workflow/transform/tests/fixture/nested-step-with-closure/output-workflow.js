import { DurableAgent } from '@workflow/ai/agent';
/**__internal_workflows{"workflows":{"input.js":{"wflow":{"workflowId":"workflow//input.js//wflow"}}},"steps":{"input.js":{"_anonymousStep0":{"stepId":"step//input.js//_anonymousStep0"}}}}*/;
export async function wflow() {
    let count = 42;
    const agent = new DurableAgent({
        model: globalThis[Symbol.for("WORKFLOW_USE_STEP")]("step//input.js//_anonymousStep0", ()=>({
                count
            }))
    });
}
wflow.workflowId = "workflow//input.js//wflow";
