import * as fs from 'node:fs';
import ts from 'typescript';
import { source } from '../lib/geistdocs/source';

interface QuoteIssue {
  file: string;
  codeBlockLine: number;
  lineInBlock: number;
  text: string;
  suggestion: string;
}

interface SingleQuoteLocation {
  start: number;
  end: number;
  replacement: string;
}

// Match code blocks - meta must be on same line as language (space, not newline)
const CODE_BLOCK_REGEX =
  /```(ts|tsx|js|jsx|typescript|javascript)(?: +([^\n]*))?\n([\s\S]*?)```/g;

function extractCodeBlocks(content: string): Array<{
  code: string;
  language: string;
  startLine: number;
  meta: string;
  codeStartIndex: number;
}> {
  const blocks: Array<{
    code: string;
    language: string;
    startLine: number;
    meta: string;
    codeStartIndex: number;
  }> = [];
  let match: RegExpExecArray | null;

  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    const language = match[1];
    const meta = match[2] || '';
    const code = match[3];
    // Calculate line number where this code block starts
    const beforeMatch = content.slice(0, match.index);
    const startLine = beforeMatch.split('\n').length;
    // Calculate the index where the code content starts (after ```lang meta\n)
    const codeStartIndex = match.index + match[0].length - code.length - 3; // -3 for closing ```

    blocks.push({ code, language, startLine, meta, codeStartIndex });
  }

  // Reset regex state
  CODE_BLOCK_REGEX.lastIndex = 0;

  return blocks;
}

function cleanCode(code: string): string {
  // Remove fumadocs annotations - remove the entire comment including any text after
  return code
    .replace(/\s*\/\/\s*\[!code[^\]]*\].*$/gm, '')
    .replace(/\s*\/\*\s*\[!code[^\]]*\]\s*\*\//g, '');
}

// Detect if code contains JSX syntax
function containsJsx(code: string): boolean {
  return (
    /<[A-Z][a-zA-Z]*[\s/>]/.test(code) ||
    /<\/[a-zA-Z]+>/.test(code) ||
    /return\s*\(?\s*</.test(code)
  );
}

function findSingleQuotedStrings(
  code: string,
  language: string,
  meta: string
): Array<{ line: number; text: string; suggestion: string }> {
  const issues: Array<{ line: number; text: string; suggestion: string }> = [];

  // Determine script kind based on language, title metadata, OR JSX content
  const isTsx =
    language === 'tsx' ||
    language === 'jsx' ||
    meta.includes('.tsx') ||
    meta.includes('.jsx') ||
    containsJsx(code);

  const scriptKind = isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    `example.${isTsx ? 'tsx' : 'ts'}`,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  function visit(node: ts.Node) {
    if (ts.isStringLiteral(node)) {
      const start = node.getStart(sourceFile);
      const rawChar = code[start];

      if (rawChar === "'") {
        const pos = sourceFile.getLineAndCharacterOfPosition(start);
        issues.push({
          line: pos.line + 1,
          text: node.getText(sourceFile),
          suggestion: `"${node.text}"`,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

function findSingleQuoteLocations(
  code: string,
  language: string,
  meta: string
): SingleQuoteLocation[] {
  const locations: SingleQuoteLocation[] = [];

  const isTsx =
    language === 'tsx' ||
    language === 'jsx' ||
    meta.includes('.tsx') ||
    meta.includes('.jsx') ||
    containsJsx(code);

  const scriptKind = isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    `example.${isTsx ? 'tsx' : 'ts'}`,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  function visit(node: ts.Node) {
    if (ts.isStringLiteral(node)) {
      const start = node.getStart(sourceFile);
      const rawChar = code[start];

      if (rawChar === "'") {
        const end = node.getEnd();
        // Escape any double quotes inside the string and create replacement
        const escapedText = node.text.replace(/"/g, '\\"');
        locations.push({
          start,
          end,
          replacement: `"${escapedText}"`,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  // Sort by start position descending so we can replace from end to start
  return locations.sort((a, b) => b.start - a.start);
}

function fixCodeBlock(code: string, language: string, meta: string): string {
  const locations = findSingleQuoteLocations(code, language, meta);
  let fixedCode = code;

  // Replace from end to start to maintain correct positions
  for (const loc of locations) {
    fixedCode =
      fixedCode.slice(0, loc.start) +
      loc.replacement +
      fixedCode.slice(loc.end);
  }

  return fixedCode;
}

async function checkQuotes() {
  const fixMode = process.argv.includes('--fix');
  const allIssues: QuoteIssue[] = [];
  const filesToFix = new Map<string, string>();

  const pages = source.getPages();

  for (const page of pages) {
    const content = await page.data.getText('raw');
    const blocks = extractCodeBlocks(content);
    let fixedContent = content;
    let hasIssues = false;

    // Process blocks in reverse order for fixing (to maintain positions)
    const blocksReversed = [...blocks].reverse();

    for (const block of blocksReversed) {
      // Skip blocks marked with lint-nocheck
      if (block.meta.includes('lint-nocheck')) {
        continue;
      }

      const cleanedCode = cleanCode(block.code);
      const stringIssues = findSingleQuotedStrings(
        cleanedCode,
        block.language,
        block.meta
      );

      if (stringIssues.length > 0) {
        hasIssues = true;

        for (const issue of stringIssues) {
          allIssues.push({
            file: page.absolutePath,
            codeBlockLine: block.startLine,
            lineInBlock: issue.line,
            text: issue.text,
            suggestion: issue.suggestion,
          });
        }

        if (fixMode) {
          // Fix the original code (not cleaned), then replace in content
          const fixedCode = fixCodeBlock(
            block.code,
            block.language,
            block.meta
          );
          const codeStart = block.codeStartIndex;
          const codeEnd = codeStart + block.code.length;
          fixedContent =
            fixedContent.slice(0, codeStart) +
            fixedCode +
            fixedContent.slice(codeEnd);
        }
      }
    }

    if (hasIssues && fixMode) {
      filesToFix.set(page.absolutePath, fixedContent);
    }
  }

  // Write fixed files
  if (fixMode && filesToFix.size > 0) {
    for (const [filePath, content] of filesToFix) {
      fs.writeFileSync(filePath, content);
    }
    const green = (s: string) => `\x1b[32m\x1b[1m${s}\x1b[0m`;
    console.log(
      green(
        `Fixed ${allIssues.length} single-quoted strings in ${filesToFix.size} files`
      )
    );
    return;
  }

  // Group issues by file
  const issuesByFile = new Map<string, typeof allIssues>();
  for (const issue of allIssues) {
    const existing = issuesByFile.get(issue.file) || [];
    existing.push(issue);
    issuesByFile.set(issue.file, existing);
  }

  const green = (s: string) => `\x1b[32m\x1b[1m${s}\x1b[0m`;
  const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
  const redBold = (s: string) => `\x1b[31m\x1b[1m${s}\x1b[0m`;

  if (allIssues.length > 0) {
    console.error();
    for (const [file, issues] of issuesByFile) {
      console.error(`Single-quoted strings in ${file}:`);
      for (const issue of issues) {
        console.error(
          `  ${red(issue.text)} → ${issue.suggestion}: at line ${issue.codeBlockLine + issue.lineInBlock}`
        );
      }
    }
    console.log('------');
    console.error(
      redBold(
        `${issuesByFile.size} errored file${issuesByFile.size === 1 ? '' : 's'}, ${allIssues.length} error${allIssues.length === 1 ? '' : 's'}`
      )
    );
    console.error();
    process.exit(1);
  } else {
    console.log(green('0 errored files, 0 errors'));
  }
}

void checkQuotes();
