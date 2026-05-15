import ts from 'typescript';
import type { Config } from '../../config';
import type { ScanResult } from '../../scanner';
import {
  extractGoSymbolLines,
  extractPhpSymbolLines,
  extractPythonSymbolLines,
  extractVuePropKeys,
  scriptOrSelfForAnalysis,
} from '../../source-extract';
import { styleDirective } from '../prompt';
import { insertAfterHeading } from './validate';

export function insertNotesSection(md: string, notes: string, afterHeading: string): string {
  if (!notes.trim()) return md;
  const cleanNotes = notes.trim().replace(/\r\n/g, '\n');
  const section = `## Notes (LLM)\n\n${cleanNotes}\n`;
  const re = new RegExp(`^## ${afterHeading}\\b[^\\n]*\\n`, 'm');
  const m = re.exec(md);
  if (!m) {
    const idx = md.indexOf('\n## ');
    if (idx >= 0) return md.slice(0, idx) + '\n' + section + '\n' + md.slice(idx);
    return md + '\n\n' + section;
  }
  const insertAt = m.index + m[0].length;
  return md.slice(0, insertAt) + '\n' + section + '\n' + md.slice(insertAt);
}

export function buildNotesPrompt(
  config: Config,
  kind: 'root' | 'subsystem',
  title: string,
  exportsBlock: string,
  snippet: string
): string {
  const rules = [
    `Write concise notes for ${kind} instructions.`,
    `Output markdown ONLY: 6–10 bullet points. No headings.`,
    `No fluff. Focus on intent, invariants, gotchas, failure modes, and where to start reading.`,
    `If uncertain, say "unknown" instead of guessing.`,
    `Do NOT restate obvious exports/signatures; add meaning.`,
    styleDirective(config, 'notes'),
  ].join('\n');

  return [
    rules,
    ``,
    `TITLE: ${title}`,
    ``,
    `EXPORTS (verbatim):`,
    '```',
    exportsBlock || '(none)',
    '```',
    ``,
    `CODE SNIPPETS (selected):`,
    '```',
    snippet || '(none)',
    '```',
  ].join('\n');
}

export function buildSnippetForFiles(scan: ScanResult, sourceFiles: string[], maxChars: number): string {
  const parts: string[] = [];
  let budget = maxChars;

  const pickLinesFallback = (content: string): string[] => {
    const lines = content.split('\n');
    const head = lines.slice(0, 140);
    const interesting = lines
      .filter(l =>
        /process\.env|getenv\s*\(|(?:^|[^\w$.])env\s*\(|throw\s+new|(?:\$_(?:ENV|SERVER))\b|fetch\(|axios|fs\.|readFile|writeFile|execSync|child_process/i.test(
          l
        )
      )
      .slice(0, 60);
    return [...head, '', ...interesting].slice(0, 260);
  };

  const pickExportBodiesTs = (filePath: string, content: string): string => {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const hasExport = (node: ts.Node): boolean => {
      const mods = (node as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
      return !!mods?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    };

    const chunks: string[] = [];
    const addChunk = (label: string, text: string) => {
      const t = text.trim();
      if (!t) return;
      // Hard cap per-chunk to avoid exploding prompt size.
      const capped = t.length > 2200 ? t.slice(0, 2190) + '\n// … truncated …' : t;
      chunks.push(`\n// ── export: ${label} ──\n` + capped);
    };

    for (const st of sf.statements) {
      if (!hasExport(st)) continue;

      // Prefer full decl text for readability
      if (ts.isFunctionDeclaration(st)) {
        const name = st.name?.text ?? 'function';
        addChunk(name, st.getText(sf));
      } else if (ts.isClassDeclaration(st)) {
        const name = st.name?.text ?? 'class';
        addChunk(name, st.getText(sf));
      } else if (ts.isVariableStatement(st)) {
        // export const foo = (...) => { ... }
        // Keep the whole statement (likely includes implementation).
        const names: string[] = [];
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name)) names.push(d.name.text);
        }
        addChunk(names.join(', ') || 'vars', st.getText(sf));
      } else if (ts.isExportDeclaration(st) || ts.isExportAssignment(st)) {
        addChunk('re-export', st.getText(sf));
      }
    }

    if (chunks.length === 0) return '';

    // Include a small header for context (imports + top doc comment)
    const head = content.split('\n').slice(0, 80).join('\n');
    return [`// ── header ──\n${head}`, ...chunks].join('\n');
  };

  for (const sf of sourceFiles) {
    const f = scan.files.find(x => x.path === sf && x.content);
    if (!f?.content) continue;
    const { body, virtualPath } = scriptOrSelfForAnalysis(sf, f.content);

    const picked = /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(virtualPath)
      ? (() => {
          try {
            const astPick = pickExportBodiesTs(virtualPath, body);
            return astPick || pickLinesFallback(body).join('\n');
          } catch {
            return pickLinesFallback(body).join('\n');
          }
        })()
      : /\.php$/i.test(sf)
        ? extractPhpSymbolLines(f.content).join('\n\n')
        : /\.py$/i.test(sf)
          ? extractPythonSymbolLines(f.content).join('\n\n')
          : /\.go$/i.test(sf)
            ? extractGoSymbolLines(f.content).join('\n\n')
            : pickLinesFallback(f.content).join('\n');

    const chunk = `\n// ── ${sf} ──\n` + picked;
    if (chunk.length > budget) break;
    parts.push(chunk);
    budget -= chunk.length;
  }

  return parts.join('\n');
}

export function insertExportNotesUnderSignatures(md: string, notes: string): string {
  if (!notes.trim()) return md;
  const clean = notes.trim().replace(/\r\n/g, '\n');
  const section = `### Notes (LLM)\n\n${clean}\n`;
  return insertAfterHeading(md, 'Signatures', section);
}

export function extractExportNamesForNotes(scan: ScanResult, sourceFiles: string[]): string[] {
  const out = new Set<string>();
  const isTsJsLike = (p: string) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(p);

  for (const sfPath of sourceFiles) {
    const f = scan.files.find(x => x.path === sfPath && x.content);
    if (!f?.content) continue;

    const { body, virtualPath } = scriptOrSelfForAnalysis(sfPath, f.content);

    if (isTsJsLike(virtualPath)) {
      try {
        const sf = ts.createSourceFile(virtualPath, body, ts.ScriptTarget.Latest, true);
        const hasExport = (node: ts.Node): boolean => {
          const mods = (node as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
          return !!mods?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        };
        for (const st of sf.statements) {
          if (!hasExport(st)) continue;
          if (ts.isFunctionDeclaration(st) && st.name) out.add(st.name.text);
          else if (ts.isClassDeclaration(st) && st.name) out.add(st.name.text);
          else if (ts.isVariableStatement(st)) {
            for (const d of st.declarationList.declarations) {
              if (ts.isIdentifier(d.name)) out.add(d.name.text);
            }
          }
        }
        if (!/\.vue$/i.test(sfPath)) continue;
      } catch {
        // fall through to regex
      }
    }

    if (/\.php$/i.test(sfPath)) {
      for (const line of extractPhpSymbolLines(f.content)) {
        const c = line.match(/(?:^|\s)(?:class|interface|trait|enum)\s+(\w+)/i);
        if (c) out.add(c[1]);
        const fn = line.match(/function\s+(\w+)\s*\(/i);
        if (fn) out.add(fn[1]);
      }
      continue;
    }

    if (/\.py$/i.test(sfPath)) {
      for (const line of extractPythonSymbolLines(f.content)) {
        const defm = line.match(/def\s+(\w+)\s*\(/);
        if (defm) out.add(defm[1]);
        const clm = line.match(/class\s+(\w+)/);
        if (clm) out.add(clm[1]);
      }
      continue;
    }

    if (/\.go$/i.test(sfPath)) {
      for (const line of extractGoSymbolLines(f.content)) {
        if (!line.startsWith('func ')) continue;
        const m = line.match(/^func(?:\s+\([^)]+\))?\s+(\w+)\s*\(/);
        if (m) out.add(m[1]);
      }
      continue;
    }

    if (/\.vue$/i.test(sfPath)) {
      for (const k of extractVuePropKeys(body)) out.add(k);
      for (const m of body.matchAll(/const\s+(\w+)\s*=\s*computed\s*\(/g)) out.add(m[1]);
      continue;
    }

    for (const line of body.split('\n')) {
      const m = line.match(/^export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)/);
      if (m) out.add(m[1]);
    }
  }

  return [...out].sort();
}

export function buildExportNotesPrompt(config: Config, title: string, exportNames: string[], snippet: string): string {
  return [
    `Write per-export notes for a code subsystem.`,
    `Output markdown ONLY.`,
    styleDirective(config, 'notes'),
    `Rules:`,
    `- One bullet per export name, in the same order as provided.`,
    `- Format: - **<name>**: <one short sentence>`,
    `- Focus on intent + gotchas + failure modes (if visible).`,
    `- If unknown from snippet, write: "unknown".`,
    `- Do NOT mention exports not in the list.`,
    ``,
    `TITLE: ${title}`,
    ``,
    `EXPORT NAMES:`,
    exportNames.map(n => `- ${n}`).join('\n') || '(none)',
    ``,
    `CODE SNIPPETS (selected):`,
    '```',
    snippet || '(none)',
    '```',
  ].join('\n');
}
