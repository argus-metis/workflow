/**__internal_workflows{"workflows":{"input.js":{"batchOverSteps":{"workflowId":"workflow//input.js//batchOverSteps"}}},"steps":{"input.js":{"logItem":{"stepId":"step//input.js//logItem"}}}}*/
/**__workflow_graph{"version":"1.0.0","workflows":{"batchOverSteps":{"workflowId":"workflow//input.js//batchOverSteps","workflowName":"batchOverSteps","filePath":"input.js","nodes":[{"id":"start","type":"workflowStart","position":{"x":250.0,"y":0.0},"data":{"label":"Start: batchOverSteps","nodeKind":"workflow_start","line":0}},{"id":"node_1","type":"step","position":{"x":250.0,"y":100.0},"data":{"label":"logItem","nodeKind":"step","stepId":"step//input.js//logItem","line":165}},{"id":"end","type":"workflowEnd","position":{"x":250.0,"y":200.0},"data":{"label":"Return","nodeKind":"workflow_end","line":0}}],"edges":[{"id":"e_start_node_1","source":"start","target":"node_1","type":"default"},{"id":"e_node_1_end","source":"node_1","target":"end","type":"default"}]}}}*/
async function logItem(item) {
  'use step';
  console.log(item);
}
export async function batchOverSteps(items) {
  'use workflow';
  await Promise.all(items.map(logItem));
}
