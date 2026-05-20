import ts from 'typescript';
import path from 'path';
import type { ScanResult } from '../../scanner';
import {
  PHP_BUNDLE_INDEX_TAIL,
  PHP_BUNDLE_ROUTING_FILE_CAP,
} from '../constants';
import {
  extractGoSymbolLines,
  extractPhpSymbolLines,
  extractPythonSymbolLines,
  compactTsExportLine,
  buildPhpOneLineSummary,
  buildPhpRoutingSignatures,
  buildVueRoutingSignatures,
  extractScriptSkeleton,
  extractVueComputedBranches,
  isMessageOrPromptPath,
  isPromptTemplateBody,
  extractVuePropKeys,
  extractVueScriptCombined,
  extractVueSymbolLines,
  extractVueTemplateBrief,
  scriptOrSelfForAnalysis,
} from '../../source-extract';
import {
  extractCSharpSymbolLines,
} from '../../source-extract';
import {
  detectFrameworks,
  extractRuntimeSection,
} from '../../framework-extract';

/** JSDoc attached to a declaration (leading trivia via TS API). */
export function formatAttachedJSDocBlocks(sf: ts.SourceFile, node: ts.Node): string[] {
  const out: string[] = [];
  for (const t of ts.getJSDocCommentsAndTags(node)) {
    if (!ts.isJSDoc(t)) continue;
    const raw = t.getFullText(sf).trim();
    if (!raw) continue;
    const lines = raw.split('\n');
    if (lines.length > 14 || raw.length > 900) {
      const sliced = lines.slice(0, 14).join('\n');
      out.push(raw.length > 900 ? sliced.slice(0, 897) + '…\n */' : sliced + (lines.length > 14 ? '\n */' : ''));
    } else {
      out.push(raw);
    }
  }
  return out;
}

/**
 * Extract actual `export` lines from source files.
 * Passed verbatim into subsystem prompts so LLM documents real symbols only.
 */
/**
 * Extract exports with surrounding context: JSDoc comments above the export,
 * and the first meaningful line of the body (to hint at return type / purpose).
 */
export function extractExports(scan: ScanResult, sourceFiles: string[]): string {
  const sourcePaths = new Set(sourceFiles);
  const out: string[] = [];

  const phpPathsInBundle = sourceFiles.filter(p => /\.php$/i.test(p)).sort();
  const phpCap =
    phpPathsInBundle.length > PHP_BUNDLE_ROUTING_FILE_CAP
      ? PHP_BUNDLE_ROUTING_FILE_CAP
      : phpPathsInBundle.length;
  const phpIncluded = new Set(phpPathsInBundle.slice(0, phpCap));
  const phpOmitted = phpPathsInBundle.length - phpCap;

  const isTsJsLike = (p: string) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(p);

  const extractExportsFromTsAst = (filePath: string, content: string): string[] => {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const exported: string[] = [];

    const hasExportModifier = (node: ts.Node): boolean => {
      const mods = (node as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
      return !!mods?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    };

    const serialize = (node: ts.Node): string => compactTsExportLine(sf, node, filePath);

    const pushDecl = (node: ts.Node) => {
      for (const block of formatAttachedJSDocBlocks(sf, node)) {
        exported.push(block);
      }
      const line = serialize(node);
      if (line) exported.push(line);
    };

    for (const st of sf.statements) {
      // export default ...
      if (ts.isExportAssignment(st)) {
        for (const block of formatAttachedJSDocBlocks(sf, st)) {
          exported.push(block);
        }
        exported.push(`export default ${st.expression.getText(sf)}`.slice(0, 240));
        continue;
      }

      // export { a, b } from 'x'  /  export * from 'x'
      if (ts.isExportDeclaration(st)) {
        for (const block of formatAttachedJSDocBlocks(sf, st)) {
          exported.push(block);
        }
        const line = serialize(st)
          .replace(/\s*;\s*$/, '')
          .replace(/^export\s+/, 'export ');
        exported.push(`export ${line.replace(/^export\s+/, '')}`);
        continue;
      }

      // export function/class/interface/type/enum/const
      if (!hasExportModifier(st)) continue;

      if (
        ts.isFunctionDeclaration(st) ||
        ts.isClassDeclaration(st) ||
        ts.isInterfaceDeclaration(st) ||
        ts.isTypeAliasDeclaration(st) ||
        ts.isEnumDeclaration(st)
      ) {
        pushDecl(st);
        continue;
      }

      if (ts.isVariableStatement(st)) {
        // Keep the whole statement but compact.
        pushDecl(st);
      }
    }

    return exported;
  };

  for (const f of scan.files) {
    if (!sourcePaths.has(f.path) || !f.content) continue;
    if (/\.php$/i.test(f.path) && phpOmitted > 0 && !phpIncluded.has(f.path)) continue;
    const fileExports: string[] = [];
    const { body, virtualPath } = scriptOrSelfForAnalysis(f.path, f.content);

    // Prefer AST for TS/JS-like files (more accurate than regex). Vue → extracted `<script>` as virtual `.ts`.
    if (isTsJsLike(virtualPath)) {
      try {
        fileExports.push(...extractExportsFromTsAst(virtualPath, body));
      } catch {
        // Fall back to regex below.
      }
    }

    if (fileExports.length === 0 && /\.php$/i.test(f.path)) {
      const { bullets: runtime } = extractRuntimeSection(f.path, f.content);
      fileExports.push(...buildPhpRoutingSignatures(f.path, body));
      if (runtime.length > 0) {
        fileExports.push('// runtime:');
        for (const r of runtime) fileExports.push(`// - ${r}`);
      }
    }

    if (fileExports.length === 0 && /\.py$/i.test(f.path)) {
      const { bullets: runtime } = extractRuntimeSection(f.path, f.content);
      fileExports.push('// Python module');
      if (runtime.length > 0) {
        fileExports.push('// runtime:');
        for (const r of runtime) fileExports.push(`// - ${r}`);
      }
      fileExports.push(...extractPythonSymbolLines(body));
    }

    if (fileExports.length === 0 && /\.go$/i.test(f.path)) {
      fileExports.push(...extractGoSymbolLines(body));
    }

    if (fileExports.length === 0 && /\.vue$/i.test(f.path)) {
      fileExports.push(...buildVueRoutingSignatures(f.path, f.content));
    }

    if (fileExports.length === 0 && /\.(tsx|jsx)$/i.test(f.path)) {
      const fws = detectFrameworks(f.path, f.content);
      const { bullets: runtime } = extractRuntimeSection(f.path, f.content);
      fileExports.push(
        `// ${fws.length ? fws.join(' + ') : 'JSX'} — ${/\.tsx$/i.test(f.path) ? 'TSX' : 'JSX'} module`
      );
      if (runtime.length > 0) {
        fileExports.push('// runtime:');
        for (const r of runtime) fileExports.push(`// - ${r}`);
      }
      const skeleton = extractScriptSkeleton(body, virtualPath);
      if (skeleton.length > 0) {
        fileExports.push('// ── skeleton ──');
        fileExports.push(...skeleton);
      }
    }

    if (fileExports.length === 0 && /\.cs$/i.test(f.path)) {
      const symbols = extractCSharpSymbolLines(body);
      const { bullets: runtime } = extractRuntimeSection(f.path, f.content);
      fileExports.push('// C# module');
      if (runtime.length > 0) {
        fileExports.push('// runtime:');
        for (const r of runtime) fileExports.push(`// - ${r}`);
      }
      if (symbols.length > 0) fileExports.push(...symbols);
    }

    if (fileExports.length === 0 && isTsJsLike(virtualPath)) {
      const { bullets: runtime } = extractRuntimeSection(f.path, f.content);
      if (runtime.length > 0) {
        fileExports.push('// runtime:');
        for (const r of runtime) fileExports.push(`// - ${r}`);
      }
      const skeleton = extractScriptSkeleton(body, virtualPath);
      if (skeleton.length > 0) {
        fileExports.push('// ── skeleton ──');
        fileExports.push(...skeleton);
      }
    }

    if (fileExports.length === 0) {
      const codeLines = body.split('\n');

      for (let i = 0; i < codeLines.length; i++) {
        const trimmed = codeLines[i].trim();
        if (!/^export\s/.test(trimmed)) continue;

        // Collect JSDoc / comment block above the export (up to 8 lines back)
        const commentLines: string[] = [];
        for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
          const prev = codeLines[j].trim();
          if (prev.startsWith('*') || prev.startsWith('/**') || prev.startsWith('*/') || prev.startsWith('//')) {
            commentLines.unshift(codeLines[j]);
          } else if (prev === '') {
            continue;
          } else {
            break;
          }
        }

        if (commentLines.length > 0) {
          fileExports.push(...commentLines.map(l => l.trimEnd()));
        }
        fileExports.push(trimmed);
      }
    }

    if (fileExports.length > 0) {
      out.push(`// ── ${f.path} ──`);
      out.push(...fileExports);
      out.push('');
    }
  }

  if (phpOmitted > 0) {
    out.push(
      `// … +${phpOmitted} more .php in this folder — search path-index by filename`,
      ''
    );
    for (const p of phpPathsInBundle.slice(phpCap, phpCap + PHP_BUNDLE_INDEX_TAIL)) {
      const scanned = scan.files.find(f => f.path === p);
      if (scanned?.content) out.push(buildPhpOneLineSummary(p, scanned.content));
    }
    if (phpOmitted > PHP_BUNDLE_INDEX_TAIL) {
      out.push(`// … +${phpOmitted - PHP_BUNDLE_INDEX_TAIL} more`);
    }
    out.push('');
  }

  return out.length > 0 ? out.join('\n') : '(no exports — see ## Source for full script)';
}

export const DETERMINISTIC_SOURCE_MAX_LINES = 80;
export const DETERMINISTIC_SOURCE_SKELETON_MAX_LINES = 48;

/** Full ## Source only when signatures are thin or UI/runtime needs script body. */
export function shouldIncludeDeterministicSource(
  scan: ScanResult,
  sourceFiles: string[],
  exportBlock: string
): boolean {
  if (sourceFiles.every(p => /\.vue$/i.test(p))) return false;
  if (sourceFiles.every(p => /\.php$/i.test(p))) return false;
  if (!exportBlock.trim() || /no exports/i.test(exportBlock)) return true;
  if (exportBlock.length < 100) return true;
  if (/routing summary/i.test(exportBlock) && exportBlock.length >= 180) return false;
  if (sourceFiles.some(p => /\.(py|go|cs)$/i.test(p)) && exportBlock.length < 180) return true;
  if (sourceFiles.every(p => isMessageOrPromptPath(p))) return false;

  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;
    const { body } = scriptOrSelfForAnalysis(sf, scanned.content);
    if (isPromptTemplateBody(body, sf)) return false;
  }
  return false;
}

export function buildDeterministicSourceSection(scan: ScanResult, sourceFiles: string[]): string[] {
  const lines: string[] = [];

  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;

    lines.push(`### \`${sf}\``);

    if (/\.vue$/i.test(sf)) {
      lines.push('', '_Vue SFC: routing in ## Signatures — open component in repo for template/script._', '');
      continue;
    }

    const { body, virtualPath } = scriptOrSelfForAnalysis(sf, scanned.content);
    const ext = path.posix.extname(sf).toLowerCase();
    const fence =
      ext === '.py' ? 'python' : ext === '.go' ? 'go' : ext === '.php' ? 'php' : 'typescript';

    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(sf) && body.trim()) {
      const skeleton = extractScriptSkeleton(body, virtualPath);
      if (skeleton.length > 0) {
        const skLines = skeleton.join('\n').split('\n');
        const capped =
          skLines.length > DETERMINISTIC_SOURCE_SKELETON_MAX_LINES
            ? [
                ...skLines.slice(0, DETERMINISTIC_SOURCE_SKELETON_MAX_LINES),
                `// ... ${skLines.length - DETERMINISTIC_SOURCE_SKELETON_MAX_LINES} more skeleton lines`,
              ]
            : skLines;
        lines.push('', '```' + fence, ...capped, '```', '');
        continue;
      }
    }

    if (isPromptTemplateBody(scanned.content, sf)) {
      lines.push('', '_Prompt/message module — see ## Signatures; open repo file to edit templates._', '');
      continue;
    }

    const bodyLines = scanned.content.split('\n');
    const cap = isMessageOrPromptPath(sf) ? 40 : DETERMINISTIC_SOURCE_MAX_LINES;
    const capped =
      bodyLines.length > cap
        ? [...bodyLines.slice(0, cap), `// ... ${bodyLines.length - cap} more lines`]
        : bodyLines;
    lines.push('', '```' + fence, ...capped, '```', '');
  }

  return lines;
}

/** Mermaid nodes for Vue SFCs: props, computeds, resolve branches. */
export function buildVueMermaidNodes(
  filePath: string,
  content: string,
  externalNodeIds: Set<string>
): string[] {
  const { body } = scriptOrSelfForAnalysis(filePath, content);
  if (!body.trim()) return [];

  const base = path.posix.basename(filePath, path.posix.extname(filePath)).replace(/[^a-zA-Z0-9_]/g, '_');
  const nodes: string[] = [`  ${base}["${path.posix.basename(filePath)}"]`];

  const propKeys = extractVuePropKeys(body);
  if (propKeys.length > 0) {
    const id = `${base}_defineProps`;
    nodes.push(
      `  ${base} --> ${id}["props: ${propKeys.slice(0, 8).join(', ')}${propKeys.length > 8 ? '…' : ''}"]`
    );
  }

  for (const m of body.matchAll(/const\s+(\w+)\s*=\s*computed\s*\(/g)) {
    const id = `${base}_cmp_${m[1]}`;
    nodes.push(`  ${base} --> ${id}["computed: ${m[1]}"]`);
  }

  const branches = extractVueComputedBranches(body);
  for (const b of branches) {
    const safe = b.replace(/[^a-zA-Z0-9_]/g, '_') || 'tag';
    const id = `${base}_r_${safe}`;
    if (externalNodeIds.has(id)) continue;
    externalNodeIds.add(id);
    nodes.push(`  ${base} --> ${id}["→ ${b}"]`);
  }

  return nodes;
}
