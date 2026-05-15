export function extractCliCommands(content: string): string[] {
  const commands: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    // Commander: .command('build [dir]')
    const m = line.match(/\.command\(\s*['"]([^'"]+)['"]/);
    if (m) commands.push(m[1].split(/\s/)[0]);
  }
  return [...new Set(commands)];
}

/** `export * from` / `export { } from` targets (barrel files). */
export function extractReExportTargets(content: string): string[] {
  const out: string[] = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    const star = t.match(/^export\s+\*\s+from\s+['"]([^'"]+)['"]/);
    if (star) out.push(star[1]);
    const named = t.match(/^export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/);
    if (named) out.push(named[1]);
  }
  return [...new Set(out)];
}

const PURPOSE_COMMENT_SKIP =
  /\.command\s*\(|^Commander:|eslint-disable|@ts-ignore|^\s*\/\/\s*─{2,}/i;

/** Reject auto-extracted purpose lines that are code hints, not file intent. */
export function isWeakFilePurpose(purpose: string): boolean {
  const t = purpose.trim();
  if (t.length < 12) return true;
  return PURPOSE_COMMENT_SKIP.test(t);
}

/** Lines before first top-level declaration (file banner only). */
export function fileHeaderSlice(content: string): string {
  const lines = content.split('\n');
  const header: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      header.push(line);
      continue;
    }
    if (
      /^(export\s|import\s|const\s|let\s|var\s|function\s|class\s|async\s+function\s|enum\s|interface\s|type\s)/.test(
        t
      )
    ) {
      break;
    }
    header.push(line);
  }
  return header.join('\n');
}

/** One-line purpose summary: JSDoc / file-level `//` / `#` (PHP) — not in-function comments. */
export function extractFilePurpose(content: string): string | null {
  const lines = fileHeaderSlice(content).split('\n');
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const rawLine = lines[i];
    const t = rawLine.trim();
    // Indented // = implementation note (e.g. inside extractCliCommands regex hint)
    if (t.startsWith('//') && /^\s{2,}\/\//.test(rawLine)) continue;
    // JSDoc / PHPDoc
    if (t.startsWith('/**')) {
      const single = t.match(/^\/\*\*\s*(.+?)\s*\*\/$/);
      if (single) return single[1];
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        const desc = lines[j].trim().replace(/^\*\s?/, '');
        if (desc && !desc.startsWith('@') && !desc.startsWith('/') && !isWeakFilePurpose(desc)) return desc;
      }
    }
    if ((t.startsWith('"""') || t.startsWith("'''")) && i < 12) {
      const q = t.startsWith('"""') ? '"""' : "'''";
      if (t.length > q.length * 2 && t.endsWith(q)) {
        return t.slice(3, -3).trim().replace(/\s+/g, ' ').slice(0, 220);
      }
      const parts: string[] = [];
      for (let j = i + 1; j < Math.min(lines.length, i + 16); j++) {
        const L = lines[j];
        if (L.includes(q)) {
          const before = L.split(q)[0]?.trim();
          if (before) parts.push(before);
          break;
        }
        const trimmed = L.trim();
        if (trimmed) parts.push(trimmed);
      }
      if (parts.length) return parts.join(' ').slice(0, 220);
    }
    if (t.startsWith('//') && i < 12) {
      const desc = t.replace(/^\/\/\s*/, '');
      if (desc.length > 10 && !isWeakFilePurpose(desc)) return desc;
    }
    if (t.startsWith('#') && i < 8 && !t.startsWith('#!')) {
      const desc = t.replace(/^#\s*/, '');
      if (desc.length > 8) return desc;
    }
  }
  return null;
}
