/**__internal_workflows{"workflows":{"input.js":{"agent":{"workflowId":"workflow//input.js//agent"}}},"steps":{"input.js":{"getWeatherInformation":{"stepId":"step//input.js//getWeatherInformation"}}}}*/
/**__workflow_graph{"version":"1.0.0","workflows":{"agent":{"workflowId":"workflow//input.js//agent","workflowName":"agent","filePath":"input.js","nodes":[{"id":"start","type":"workflowStart","position":{"x":250.0,"y":0.0},"data":{"label":"Start: agent","nodeKind":"workflow_start","line":0}},{"id":"node_1","type":"step","position":{"x":250.0,"y":100.0},"data":{"label":"getWeatherInformation","nodeKind":"step","stepId":"step//input.js//getWeatherInformation","line":230}},{"id":"end","type":"workflowEnd","position":{"x":250.0,"y":200.0},"data":{"label":"Return","nodeKind":"workflow_end","line":0}}],"edges":[{"id":"e_start_node_1","source":"start","target":"node_1","type":"default"},{"id":"e_node_1_end","source":"node_1","target":"end","type":"default"}]}}}*/
async function getWeatherInformation(city) {
  'use step';
  return `Weather for ${city}`;
}
export async function agent(prompt) {
  'use workflow';
  await generate({
    prompt,
    tools: {
      weather: {
        execute: getWeatherInformation,
      },
    },
  });
}
