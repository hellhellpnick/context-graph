import fs from 'fs';
import path from 'path';

export interface OutputFile {
  path: string;
  content: string;
}

export interface WriteResult {
  created: string[];
  updated: string[];
  errors: { path: string; error: string }[];
}

/**
 * Parse LLM response with multiple fallback strategies for different output formats.
 * Tries in order:
 *   1. <<<FILE: path>>>...<<<EOF>>>
 *   2. <!-- FILE: path -->```...```
 *   3. ## FILE: path\n```...```
 *   4. ```path/to/file.ext\n...```
 */
export function parseOutputFiles(response: string): OutputFile[] {
  // Strategy 1: Primary format with <<<FILE:>>> delimiters
  let files = parsePrimaryFormat(response);
  if (files.length > 0) return files;

  // Strategy 2: HTML comments with markdown code blocks
  files = parseHTMLCommentFormat(response);
  if (files.length > 0) return files;

  // Strategy 3: Markdown headers with code blocks
  files = parseMarkdownHeaderFormat(response);
  if (files.length > 0) return files;

  // Strategy 4: Code blocks with file paths as language specifier
  files = parseCodeBlockFormat(response);
  return files;
}

/** Strict: requires newline after >>> and <<<EOF>>> (best for cloud models). */
function parsePrimaryFormatStrict(response: string): OutputFile[] {
  const files: OutputFile[] = [];
  const regex = /<<<FILE:\s*(.+?)>>>\r?\n([\s\S]*?)<<<EOF>>>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    files.push({
      path: match[1].trim(),
      content: match[2],
    });
  }
  return files;
}

/**
 * Lenient: splits on <<<FILE:>>>; body runs until <<<EOF>>>, next <<<FILE:>>, or end of string.
 * Recovers local models that truncate output or omit closing <<<EOF>>>.
 */
function parsePrimaryFormatLenient(response: string): OutputFile[] {
  const files: OutputFile[] = [];
  const segments = response.split(/<<<FILE:\s*/i);
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const close = seg.indexOf('>>>');
    if (close === -1) continue;
    const filePath = seg.slice(0, close).trim();
    if (!filePath || /[\r\n]/.test(filePath)) continue;
    let body = seg.slice(close + 3).replace(/^\r?\n/, '');
    let end = body.length;
    const eof = body.indexOf('<<<EOF>>>');
    if (eof >= 0) end = Math.min(end, eof);
    const nextFile = body.search(/<<<FILE:\s*/i);
    if (nextFile >= 0) end = Math.min(end, nextFile);
    const content = body.slice(0, end).trimEnd();
    if (!isPlausibleArtifactPath(filePath)) continue;
    files.push({ path: filePath.trim(), content });
  }
  const byPath = new Map<string, string>();
  for (const f of files) {
    const prev = byPath.get(f.path);
    if (prev === undefined || f.content.length >= prev.length) byPath.set(f.path, f.content);
  }
  return [...byPath.entries()].map(([path, content]) => ({ path, content }));
}

function isPlausibleArtifactPath(p: string): boolean {
  const t = p.trim();
  if (t === '.copilotignore') return true;
  return /\.(?:md|json)$/i.test(t);
}

function parsePrimaryFormat(response: string): OutputFile[] {
  const strict = parsePrimaryFormatStrict(response);
  const lenient = parsePrimaryFormatLenient(response);
  if (strict.length === 0 && lenient.length > 0) return lenient;
  if (lenient.length > strict.length) return lenient;
  return strict;
}

function parseHTMLCommentFormat(response: string): OutputFile[] {
  const files: OutputFile[] = [];
  // <!-- FILE: path/to/file.md -->
  // ```markdown
  // content
  // ```
  const regex = /<!--\s*FILE:\s*(.+?)\s*-->\s*\n```[a-z]*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    files.push({
      path: match[1].trim(),
      content: match[2],
    });
  }
  return files;
}

function parseMarkdownHeaderFormat(response: string): OutputFile[] {
  const files: OutputFile[] = [];
  // ## FILE: path/to/file.md
  // ```markdown
  // content
  // ```
  const regex = /^#{2,4}\s+FILE:\s*(.+?)\s*$\n+```[a-z]*\n([\s\S]*?)```/gim;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    files.push({
      path: match[1].trim(),
      content: match[2],
    });
  }
  return files;
}

function parseCodeBlockFormat(response: string): OutputFile[] {
  const files: OutputFile[] = [];
  // ```path/to/file.md
  // content
  // ```
  const regex = /```([a-zA-Z0-9_.\-/]+\.[a-z]+)\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    const potentialPath = match[1].trim();
    // Filter out language identifiers like 'typescript', 'javascript'
    if (potentialPath.includes('/') || potentialPath.startsWith('.')) {
      files.push({
        path: potentialPath,
        content: match[2],
      });
    }
  }
  return files;
}

export function writeOutputFiles(files: OutputFile[], projectRoot: string): WriteResult {
  const result: WriteResult = { created: [], updated: [], errors: [] };

  for (const file of files) {
    // Guard against path traversal (normalize for case-insensitive FS on Windows)
    const fullPath = path.resolve(projectRoot, file.path);
    const resolvedRoot = path.resolve(projectRoot);
    const normalFull = fullPath.toLowerCase();
    const normalRoot = resolvedRoot.toLowerCase();
    if (!normalFull.startsWith(normalRoot + path.sep) &&
      normalFull !== normalRoot) {
      result.errors.push({ path: file.path, error: 'Path traversal attempt blocked' });
      continue;
    }

    const dir = path.dirname(fullPath);
    const existed = fs.existsSync(fullPath);

    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, file.content, 'utf8');
      if (existed) {
        result.updated.push(file.path);
      } else {
        result.created.push(file.path);
      }
    } catch (e) {
      result.errors.push({ path: file.path, error: (e as Error).message });
    }
  }

  return result;
}
