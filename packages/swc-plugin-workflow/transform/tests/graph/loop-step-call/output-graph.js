/**__internal_workflows{"workflows":{"input.js":{"loopWorkflow":{"workflowId":"workflow//input.js//loopWorkflow"}}},"steps":{"input.js":{"stepFn":{"stepId":"step//input.js//stepFn"}}}}*/
/**__workflow_graph{"version":"1.0.0","workflows":{"loopWorkflow":{"workflowId":"workflow//input.js//loopWorkflow","workflowName":"loopWorkflow","filePath":"input.js","nodes":[{"id":"start","type":"workflowStart","position":{"x":250.0,"y":0.0},"data":{"label":"Start: loopWorkflow","nodeKind":"workflow_start","line":0}},{"id":"node_1","type":"step","position":{"x":250.0,"y":100.0},"data":{"label":"stepFn","nodeKind":"step","stepId":"step//input.js//stepFn","line":104}},{"id":"end","type":"workflowEnd","position":{"x":250.0,"y":200.0},"data":{"label":"Return","nodeKind":"workflow_end","line":0}}],"edges":[{"id":"e_start_node_1","source":"start","target":"node_1","type":"default"},{"id":"e_node_1_end","source":"node_1","target":"end","type":"default"}]}}}*/
export async function loopWorkflow(items) {
  'use workflow';
  for (const item of items) {
    await stepFn(item);
  }
}
async function stepFn(value) {
  'use step';
  return value;
}
