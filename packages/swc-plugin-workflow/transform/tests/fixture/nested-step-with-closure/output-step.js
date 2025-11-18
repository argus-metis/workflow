import { registerStepFunction } from "workflow/internal/private";
import { DurableAgent } from '@workflow/ai/agent';
import { gateway } from 'ai';
/**__internal_workflows{"workflows":{"input.js":{"wflow":{"workflowId":"workflow//input.js//wflow"}}},"steps":{"input.js":{"_anonymousStep0":{"stepId":"step//input.js//_anonymousStep0"}}}}*/;
async function _anonymousStep0() {
    const { count } = this[Symbol.for("WORKFLOW_CLOSURE")];
    console.log('count', count);
    return gateway('openai/gpt-5');
}
export async function wflow() {
    'use workflow';
    let count = 42;
    const agent = new DurableAgent({
        model: _anonymousStep0
    });
}
registerStepFunction("step//input.js//_anonymousStep0", _anonymousStep0);
