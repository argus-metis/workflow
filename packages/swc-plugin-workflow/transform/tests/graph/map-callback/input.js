async function logItem(item) {
  'use step';
  console.log(item);
}

export async function batchOverSteps(items) {
  'use workflow';

  await Promise.all(items.map(logItem));
}
