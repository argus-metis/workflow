import { expect, test } from 'vitest';
import { frame } from './frame.js';

test('frames', () => {
  const output = frame({
    text: 'text text text text\ntext text text text',
    contents: [
      'contents0 contents0 contents0\ncontents0 contents0 contents0',
      'contents1 contents1 contents1\ncontents1 contents1 contents1',
    ],
  });

  expect(`\n${output}\n`).toMatchInlineSnapshot(`
    "
    text text text text
    text text text text
    ├▶ contents0 contents0 contents0
    │  contents0 contents0 contents0
    ╰▶ contents1 contents1 contents1
       contents1 contents1 contents1
    "
  `);
});

test('composable', () => {
  const output = frame({
    text: 'text text text text\ntext text text text',
    contents: [
      frame({
        text: 'whatever\nwhenever',
        contents: ['inner0\ninner0'],
      }),
      frame({
        text: 'whatever2\nwhenever2',
        contents: ['inner1\ninner1'],
      }),
    ],
  });
  expect(`\n${output}\n`).toMatchInlineSnapshot(`
    "
    text text text text
    text text text text
    ├▶ whatever
    │  whenever
    │  ╰▶ inner0
    │     inner0
    ╰▶ whatever2
       whenever2
       ╰▶ inner1
          inner1
    "
  `);
});
