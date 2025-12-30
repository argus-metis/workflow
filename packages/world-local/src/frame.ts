export function frame({
  text,
  contents,
}: {
  text: string;
  contents: string[];
}): string {
  const result = [text];

  contents.forEach((content, index) => {
    const lines = content.split('\n');
    const isLastContent = index === contents.length - 1;

    const firstLinePrefix = isLastContent ? '╰▶ ' : '├▶ ';
    const continuationPrefix = isLastContent ? '   ' : '│  ';

    const framedLines = lines.map((line, lineIndex) => {
      const prefix = lineIndex === 0 ? firstLinePrefix : continuationPrefix;
      return `${prefix}${line}`;
    });

    result.push(...framedLines);
  });

  return result.join('\n');
}
