import type { OutputFile } from '../writer';

/** @internal kept for fallback only */
interface SubsystemMapping {
  instructionPath: string;
  sourceFiles: string[];
}

export function parseSubsystemMappings(generatedFiles: OutputFile[]): SubsystemMapping[] {
  const indexFile = generatedFiles.find(f => f.path.endsWith('/index.md') || f.path === 'index.md');
  if (!indexFile) return [];

  const mappings: SubsystemMapping[] = [];

  // Match table rows containing a link to *.instructions.md and a source files cell
  // Pattern: | [label](rel/path.instructions.md) | `src/foo.ts`, `src/bar.ts` | ...
  const rowRegex = /\|\s*\[([^\]]+)\]\(([^)]*\.instructions\.md)\)\s*\|\s*([^|]+)\|/g;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(indexFile.content)) !== null) {
    const relPath = match[2]; // e.g. "core/scanner.instructions.md"
    const sourceCol = match[3]; // e.g. "`src/scanner.ts`, `src/formatter.ts`"
    const fullPath = `.github/instructions/${relPath}`;

    const sourceFiles: string[] = [];
    const fileRegex = /`([^`]+\.[a-z]+)`/g;
    let fm: RegExpExecArray | null;
    while ((fm = fileRegex.exec(sourceCol)) !== null) {
      sourceFiles.push(fm[1]);
    }

    mappings.push({ instructionPath: fullPath, sourceFiles });
  }

  return mappings;
}

/** Fallback: extract subsystem paths from markdown links (old format) */
export function findMissingSubsystemPaths(generatedFiles: OutputFile[]): string[] {
  const indexFile = generatedFiles.find(f => f.path.endsWith('/index.md') || f.path === 'index.md');
  if (!indexFile) return [];

  const regex = /\]\(([^)]*\.instructions\.md)\)/g;
  const paths: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(indexFile.content)) !== null) {
    const fullPath = `.github/instructions/${match[1]}`;
    const alreadyGenerated = generatedFiles.some(f => f.path === fullPath || f.path.endsWith(match![1]));
    if (!alreadyGenerated) paths.push(fullPath);
  }

  return [...new Set(paths)];
}
