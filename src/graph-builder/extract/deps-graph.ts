import path from 'path';
import ts from 'typescript';
import type { ScanResult } from '../../scanner';
import { extractGoImports, scriptOrSelfForAnalysis } from '../../source-extract';
import { SOURCE_EXT_RE } from '../constants';
import { fileReadsEnvironment } from '../prompt';

export const TS_JS_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.go', '.py'];

export function isTsJsLikePath(p: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i.test(p);
}

export function stripKnownExt(p: string): string {
  return p.replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue|go|py)$/i, '');
}

export function extractImportSpecifiersFromTsAst(filePath: string, content: string): string[] {
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const out: string[] = [];

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      out.push(st.moduleSpecifier.text);
      continue;
    }
    if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
      // export { x } from '...'
      out.push(st.moduleSpecifier.text);
      continue;
    }
    // const x = require('foo')
    if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) {
        const init = decl.initializer;
        if (!init || !ts.isCallExpression(init)) continue;
        const callee = init.expression;
        if (!ts.isIdentifier(callee) || callee.text !== 'require') continue;
        const arg0 = init.arguments[0];
        if (arg0 && ts.isStringLiteral(arg0)) out.push(arg0.text);
      }
    }
  }

  return out;
}

export function resolveInternalImport(
  fromFile: string,
  spec: string,
  existingPaths: Set<string>
): string | null {
  if (!spec.startsWith('.')) return null;

  const fromDir = path.posix.dirname(fromFile);
  const raw = path.posix.normalize(path.posix.join(fromDir, spec));

  // If import already includes extension
  if (existingPaths.has(raw)) return raw;

  const noExt = stripKnownExt(raw);
  if (existingPaths.has(noExt)) return noExt;

  // Try file with known extensions
  for (const ext of TS_JS_EXTS) {
    const cand = `${noExt}${ext}`;
    if (existingPaths.has(cand)) return cand;
  }

  // Try index files
  for (const ext of TS_JS_EXTS) {
    const cand = `${noExt}/index${ext}`;
    if (existingPaths.has(cand)) return cand;
  }

  return null;
}

export function buildDeterministicDependencyGraph(
  scan: ScanResult,
  opts?: { maxNodes?: number }
): string {
  const files = scan.files.filter(f => f.tier !== 3 && f.content);
  const existing = new Set(files.map(f => f.path.replace(/\\/g, '/')));

  // Danger heuristic: known sources that read env are highlighted
  const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|py|go|rs|java|kt|cs|rb|php)$/i;
  const dangerPaths = new Set([
    'src/cli.ts',
    'src/config.ts',
    'src/project-root.ts',
    'src/graph-builder.ts',
    'src/writer.ts',
    'src/providers/openai.ts',
    'src/providers/anthropic.ts',
    'src/cli/commands/build.ts',
  ]);
  const readsEnv = fileReadsEnvironment;

  // Cap nodes for very large repos to keep root file reasonable in deterministic mode.
  const MAX_NODES = opts?.maxNodes ?? 140;
  const selected = files.length <= MAX_NODES
    ? files
    : [
        ...files.filter(f => f.tier === 0),
        ...files.filter(f => f.tier === 1),
        ...files.filter(f => f.tier === 2),
      ].slice(0, MAX_NODES);

  const selectedSet = new Set(selected.map(f => f.path.replace(/\\/g, '/')));

  const edges: Array<{ from: string; to: string; kind: 'import' | 'require' | 'unknown' }> = [];

  for (const f of selected) {
    const from = f.path.replace(/\\/g, '/');
    if (!f.content) continue;

    const { body, virtualPath } = scriptOrSelfForAnalysis(from, f.content);

    let specs: string[] = [];
    let kind: 'import' | 'require' | 'unknown' = 'unknown';
    if (isTsJsLikePath(virtualPath) && /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(virtualPath)) {
      try {
        specs = extractImportSpecifiersFromTsAst(virtualPath, body);
        kind = 'import';
      } catch {
        specs = [];
      }
    }

    if (specs.length === 0) {
      // Fallback regex for any language
      for (const line of body.split('\n')) {
        const mFrom = line.match(/\bfrom\s*['"]([^'"]+)['"]/);
        if (mFrom) {
          specs.push(mFrom[1]);
          kind = 'import';
          continue;
        }
        const mReq = line.match(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (mReq) {
          specs.push(mReq[1]);
          kind = 'require';
        }
      }
    }

    if (specs.length === 0 && /\.go$/i.test(from)) {
      specs = extractGoImports(body);
      kind = 'import';
    }

    for (const s of specs) {
      const resolved = resolveInternalImport(from, s, existing);
      if (!resolved) continue;
      if (!selectedSet.has(resolved)) continue;
      edges.push({ from, to: resolved, kind });
    }
  }

  // Node ids must be mermaid-safe
  const idOf = (p: string) => `n_${p.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const labelOf = (p: string) => {
    const scanned = scan.files.find(x => x.path.replace(/\\/g, '/') === p);
    const content = scanned?.content ?? '';
    const base = p;
    const isDanger =
      dangerPaths.has(p) ||
      (SOURCE_EXT_RE.test(p) && content && readsEnv(content));
    return `${base}${isDanger ? ' 🔴' : ''}`;
  };

  const lines: string[] = ['```mermaid', 'graph LR'];

  const tier0 = selected.filter(f => f.tier === 0).map(f => f.path.replace(/\\/g, '/')).sort();
  const tier1 = selected.filter(f => f.tier === 1).map(f => f.path.replace(/\\/g, '/')).sort();
  const tier2 = selected.filter(f => f.tier === 2).map(f => f.path.replace(/\\/g, '/')).sort();

  const addSubgraph = (title: string, paths: string[]) => {
    if (paths.length === 0) return;
    lines.push(`  subgraph ${idOf(title)}["${title}"]`);
    for (const p of paths) {
      lines.push(`    ${idOf(p)}["${labelOf(p)}"]`);
    }
    lines.push('  end');
  };

  addSubgraph('Infra (Tier 0)', tier0);
  addSubgraph('Entry / Seed (Tier 1)', tier1);
  addSubgraph('Code Surface (Tier 2)', tier2);

  const seenEdges = new Set<string>();
  for (const e of edges) {
    const k = `${e.from}=>${e.to}`;
    if (seenEdges.has(k)) continue;
    seenEdges.add(k);
    const label = e.kind === 'require' ? 'require()' : 'import';
    lines.push(`  ${idOf(e.from)} -->|"${label}"| ${idOf(e.to)}`);
  }

  if (files.length > selected.length) {
    lines.push(`  %% truncated: ${files.length - selected.length} nodes not shown`);
  }

  lines.push('```');
  return lines.join('\n');
}

