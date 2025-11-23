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
