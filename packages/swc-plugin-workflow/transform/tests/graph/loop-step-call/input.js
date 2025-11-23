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
