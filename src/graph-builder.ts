import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import type { Config, SubsystemGrouping, SubsystemLayout } from './config';
import { createProvider } from './providers';
import type { LLMUsage } from './providers/types';
import type { ScanResult } from './scanner';
import { formatForLLM, scanForPromptDepth } from './scanner';
import {
  extractPhpSymbolLines,
  extractPhpUseStatements,
  scriptOrSelfForAnalysis,
} from './source-extract';
import type { OutputFile } from './writer';
import { parseOutputFiles } from './writer';

export type BuildMode = 'BUILD' | 'ACTUALIZE' | 'REVIEW' | 'IMPACT';

export interface BuildOptions {
  changedFiles?: string[];
  targetFile?: string;
  existingGraphDir?: string;
}

export interface GraphResult {
  files: OutputFile[];
  rawResponse: string;
  usage: LLMUsage;
  costUSD: number | null;
}

export interface MultiPassResult {
  files: OutputFile[];
  usage: LLMUsage;
  costUSD: number | null;
  passes: number;
  /** Always present after Pass 0: parsed plan merged with scan coverage (no missing source files). */
  plan: BuildPlan;
}

/** Options for `repairBuildPlan` gap-fill / deterministic subsystem layout. */
export interface RepairBuildPlanOptions {
  subsystemGrouping?: SubsystemGrouping;
  maxFilesPerFolderSubsystem?: number;
  /** `mirror` (default): paths under `.github/instructions/` mirror the repo. `canonical`: legacy core/infra. */
  subsystemLayout?: SubsystemLayout;
}

export interface DeterministicBuildOptions {
  /**
   * Whether to generate smaller root files (mirrors `contextDepth: slim` behavior),
   * i.e. do not request index.md/metadata.json from LLM. Here it only affects
   * the shape of root outputs when callers want to mimic slim output.
   */
  slimRoot?: boolean;
  /** Merged into repairBuildPlan (e.g. subsystemGrouping for fewer instruction files). */
  repair?: RepairBuildPlanOptions;
}

export interface BuildPlanItem {
  /** Relative path inside .github/instructions/, e.g. "core/scanner.instructions.md" */
  file: string;
  area: string;
  priority: 'P0' | 'P1' | 'P2';
  sourceFiles: string[];
  /** Glob for frontmatter applyTo, e.g. "src/scanner.ts" */
  applyTo: string;
  /** 3–6 specific developer tasks where Copilot needs this file */
  useCases: string[];
  description: string;
}

export interface BuildPlan {
  projectName: string;
  projectDescription: string;
  techStack: string[];
  buildCommand?: string;
  testCommand?: string;
  subsystems: BuildPlanItem[];
}

export interface BuildCallbacks {
  onPlanReady?: (plan: BuildPlan) => void;
  onPassComplete?: (pass: number, totalPasses: number, label: string, files: OutputFile[], cost: number | null) => void;
}

export interface HybridBuildOptions {
  /**
   * Max number of subsystems to enrich with LLM notes. Remaining subsystems are deterministic-only.
   * Keep this small for local models and fast runs.
   */
  maxSubsystems?: number;
  /** "subsystem" = one notes block; "exports" = notes per exported symbol under ## Signatures */
  notesMode?: 'subsystem' | 'exports';
}

/** @internal kept for fallback only */
interface SubsystemMapping {
  instructionPath: string;
  sourceFiles: string[];
}

/** Node / Python / Rust / PHP env access heuristics for Danger Zone + mermaid. */
function fileReadsEnvironment(content: string): boolean {
  return /process\.env|os\.environ|std::env|getenv\s*\(|(?:^|[^\w$.])env\s*\(\s*['"][^'"]+['"]|(?:^|[^\w$])\$_ENV(?:\[|\b)|(?:^|[^\w$])\$_SERVER\s*\[/i.test(
    content
  );
}

const OUTPUT_FORMAT_INSTRUCTION = `
---
## MANDATORY OUTPUT FORMAT

You MUST wrap every output file in these exact delimiters. No prose outside the blocks.

<<<FILE: path/relative/to/project/root>>>
file content here
<<<EOF>>>

Start your response with the first <<<FILE: ...>>> block immediately.
Do NOT output any text, checklists, summaries, or explanations outside the file blocks.
Every file you produce must be wrapped. Multiple files = multiple blocks back-to-back.

Example:
<<<FILE: .github/instructions/copilot-instructions.md>>>
# My Project — Project Context Graph
...
<<<EOF>>>
<<<FILE: .github/instructions/index.md>>>
...
<<<EOF>>>
`;

function styleDirective(config: Config, target: 'notes' | 'root' | 'subsystem'): string {
  if (config.outputStyle !== 'compact') return '';
  if (target === 'notes') {
    return [
      `STYLE: ULTRA-COMPACT.`,
      `- Max 10 bullets total.`,
      `- Each bullet <= 18 words.`,
      `- No filler, no greetings, no "sure".`,
    ].join('\n');
  }
  return [
    `STYLE: COMPACT.`,
    `- Dense bullets, minimal prose.`,
    `- Prefer lists/tables over paragraphs.`,
    `- Avoid repeating obvious code; add only intent + gotchas.`,
  ].join('\n');
}

function loadSystemPrompt(): string {
  const candidates = [
    path.join(__dirname, '../prompts/graph-create-agent.md'),
    path.join(__dirname, '../../graph-create-agent.md'),
    path.join(process.cwd(), 'graph-create-agent.md'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error('context-graph system prompt not found. Try reinstalling the package.');
}

function loadExistingGraph(graphDir: string): string {
  const rootFile = path.join(graphDir, 'copilot-instructions.md');
  if (!fs.existsSync(rootFile)) return '';
  return fs.readFileSync(rootFile, 'utf8');
}

// ── Export extractor (anti-hallucination) ─────────────────────────────────

/** JSDoc attached to a declaration (leading trivia via TS API). */
function formatAttachedJSDocBlocks(sf: ts.SourceFile, node: ts.Node): string[] {
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
function extractExports(scan: ScanResult, sourceFiles: string[]): string {
  const sourcePaths = new Set(sourceFiles);
  const out: string[] = [];

  const isTsJsLike = (p: string) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(p);

  const extractExportsFromTsAst = (filePath: string, content: string): string[] => {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const exported: string[] = [];

    const hasExportModifier = (node: ts.Node): boolean => {
      const mods = (node as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
      return !!mods?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    };

    const serialize = (node: ts.Node): string => {
      // Keep single-line signatures; don't try to be a full printer for the entire decl.
      const text = node.getText(sf).replace(/\s+/g, ' ').trim();
      return text.length > 240 ? text.slice(0, 237) + '…' : text;
    };

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
      fileExports.push(...extractPhpSymbolLines(body));
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

  return out.length > 0 ? out.join('\n') : '(no explicit exports found — check source files below)';
}

/**
 * Extract import statements to show inter-module dependencies.
 */
function extractImports(scan: ScanResult, sourceFiles: string[]): string[] {
  const sourcePaths = new Set(sourceFiles);
  const deps = new Set<string>();
  const NODE_BUILTINS = new Set([
    'fs', 'path', 'crypto', 'http', 'https', 'os', 'url', 'util', 'stream',
    'events', 'child_process', 'net', 'tls', 'dns', 'zlib', 'buffer',
    'querystring', 'assert', 'readline', 'worker_threads', 'cluster',
  ]);

  const isTsJsLike = (p: string) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(p);

  const addDep = (raw: string, fromFile: string) => {
    const dep = raw.trim();
    if (!dep) return;
    if (dep.startsWith('.')) {
      const resolved = path.posix.join(path.posix.dirname(fromFile), dep).replace(/\.[^.]+$/, '');
      deps.add(resolved);
      return;
    }
    if (!NODE_BUILTINS.has(dep) && !dep.startsWith('node:')) {
      deps.add(dep.split('/').slice(0, dep.startsWith('@') ? 2 : 1).join('/'));
    }
  };

  const extractImportsFromTsAst = (filePath: string, content: string): string[] => {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const out: string[] = [];

    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
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
  };

  for (const f of scan.files) {
    if (!sourcePaths.has(f.path) || !f.content) continue;
    const { body, virtualPath } = scriptOrSelfForAnalysis(f.path, f.content);

    if (isTsJsLike(virtualPath)) {
      try {
        const ast = extractImportsFromTsAst(virtualPath, body);
        for (const d of ast) addDep(d, f.path);
        if (ast.length > 0 && !/\.vue$/i.test(f.path)) continue;
      } catch {
        // fall back to regex below
      }
    } else if (/\.php$/i.test(f.path)) {
      for (const u of extractPhpUseStatements(body)) deps.add(u);
      continue;
    }

    const lines = body.split('\n');
    for (const line of lines) {
      // Match: import X from 'module', import { X } from 'module', require('module')
      const m = line.match(/(?:from|require\s*\()\s*['"]([^'"]+)['"]/);
      if (!m) continue;
      addDep(m[1], f.path);
    }
  }

  return [...deps].sort();
}

/** Check if a file is a barrel (re-exports only, no own logic). */
function isBarrelFile(content: string): boolean {
  const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
  if (lines.length === 0) return false;
  const reExportLines = lines.filter(l =>
    /^export\s+(\{.*\}\s+from|type\s+\{.*\}\s+from|\*\s+from)/.test(l.trim()) ||
    /^export\s+\{/.test(l.trim())
  );
  return reExportLines.length / lines.length >= 0.6;
}

// ── Deterministic dependency graph (file-level) ────────────────────────────

const TS_JS_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue'];

function isTsJsLikePath(p: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i.test(p);
}

function stripKnownExt(p: string): string {
  return p.replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i, '');
}

function extractImportSpecifiersFromTsAst(filePath: string, content: string): string[] {
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

function resolveInternalImport(
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

function buildDeterministicDependencyGraph(scan: ScanResult): string {
  const files = scan.files.filter(f => f.tier !== 3 && f.content);
  const existing = new Set(files.map(f => f.path.replace(/\\/g, '/')));

  // Danger heuristic: known sources that read env are highlighted
  const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|py|go|rs|java|kt|cs|rb|php)$/i;
  const dangerPaths = new Set([
    'src/cli.ts', 'src/config.ts', 'src/graph-builder.ts', 'src/writer.ts',
    'src/providers/openai.ts', 'src/providers/anthropic.ts',
  ]);
  const readsEnv = fileReadsEnvironment;

  // Cap nodes for very large repos to keep root file reasonable in deterministic mode.
  const MAX_NODES = 140;
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

/** Detect CLI entry points that use Commander/yargs/etc. */
function extractCliCommands(content: string): string[] {
  const commands: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    // Commander: .command('build [dir]')
    const m = line.match(/\.command\(\s*['"]([^'"]+)['"]/);
    if (m) commands.push(m[1].split(/\s/)[0]);
  }
  return [...new Set(commands)];
}

/** One-line purpose summary: JSDoc / `//` / `#` (PHP) / first block comment. */
function extractFilePurpose(content: string): string | null {
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const t = lines[i].trim();
    // JSDoc / PHPDoc
    if (t.startsWith('/**')) {
      const single = t.match(/^\/\*\*\s*(.+?)\s*\*\/$/);
      if (single) return single[1];
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        const desc = lines[j].trim().replace(/^\*\s?/, '');
        if (desc && !desc.startsWith('@') && !desc.startsWith('/')) return desc;
      }
    }
    if (t.startsWith('//') && i < 6) {
      const desc = t.replace(/^\/\/\s*/, '');
      if (desc.length > 10) return desc;
    }
    if (t.startsWith('#') && i < 8 && !t.startsWith('#!')) {
      const desc = t.replace(/^#\s*/, '');
      if (desc.length > 8) return desc;
    }
  }
  return null;
}

// ── Planning pass ──────────────────────────────────────────────────────────

function buildPlanningPassMessage(scan: ScanResult): string {
  const today = new Date().toISOString().slice(0, 10);
  const fileList = scan.files
    .filter(f => f.tier !== 3 && f.content)
    .map(f => `  ${f.path} [T${f.tier}, ${f.lines} lines]`)
    .join('\n');

  const totalFiles = scan.files.filter(f => f.tier !== 3 && f.content).length;

  return [
    `You are a senior software architect analyzing a codebase to design an optimal AI instruction graph.`,
    `Today's date: ${today}`,
    ``,
    `TASK: Output a JSON build plan for the instruction graph. Raw JSON only — no prose, no code fences.`,
    ``,
    `RULES FOR THE PLAN:`,
    `- Create ONE subsystem entry per logical concern. 1 source file = 1 entry (ideal).`,
    `- NEVER group unrelated modules together. Smaller, focused files are always better.`,
    `- Exception: files in the same directory that form ONE coherent API may be grouped`,
    `  (e.g., providers/index.ts + providers/openai.ts + providers/anthropic.ts + providers/types.ts`,
    `   → one entry "infra/providers.instructions.md" with applyTo: "src/providers/**").`,
    `- "useCases": list 4–6 specific developer tasks where GitHub Copilot would need to read this file.`,
    `  Be concrete: "debugging why gpt-4o returns 400" not "working with providers".`,
    `- "applyTo": glob for VS Code to auto-attach. Single file → exact path. Directory → "src/dir/**".`,
    `- "priority": P0=always needed (core config, entry), P1=frequently needed, P2=rarely needed.`,
    ``,
    `MANDATORY SELF-CHECK before outputting:`,
    `  (A) Count files in SOURCE FILES list below: ${totalFiles} files.`,
    `  (B) Count total sourceFiles entries across ALL subsystems in your plan.`,
    `  (C) A must equal B. If not, add missing files to appropriate subsystems.`,
    `  (D) No file may appear in more than one sourceFiles array.`,
    `  If checks fail — fix plan before outputting.`,
    ``,
    `OUTPUT FORMAT (raw JSON only):`,
    `{`,
    `  "projectName": "...",`,
    `  "projectDescription": "one sentence",`,
    `  "techStack": ["TypeScript", "Node.js", "..."],`,
    `  "buildCommand": "...",`,
    `  "testCommand": "...",`,
    `  "subsystems": [`,
    `    {`,
    `      "file": "core/scanner.instructions.md",`,
    `      "area": "File Scanner",`,
    `      "priority": "P1",`,
    `      "sourceFiles": ["src/scanner.ts"],`,
    `      "applyTo": "src/scanner.ts",`,
    `      "useCases": [`,
    `        "debugging why a specific file is being skipped during scan",`,
    `        "adding a new file tier classification rule",`,
    `        "understanding how token budget limits work",`,
    `        "modifying what gets included in the LLM context"`,
    `      ],`,
    `      "description": "Tier-based project scanner with token budget management"`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `SOURCE FILES TO COVER (${totalFiles} files — every one must appear in sourceFiles):`,
    fileList,
    ``,
    `## Project Context (structure + config excerpts only — subsystem passes receive full source):`,
    buildPlanningContextLight(scan),
  ].join('\n');
}

export function parseBuildPlan(raw: string): BuildPlan | null {
  // Strip markdown code fences if present
  const stripped = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  // Find first { to last } to be resilient to leading/trailing text
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    const plan = JSON.parse(stripped.slice(start, end + 1)) as BuildPlan;
    if (!plan.subsystems || !Array.isArray(plan.subsystems)) return null;
    return plan;
  } catch {
    return null;
  }
}

// ── Plan coverage: every scanned source path must map to exactly one subsystem ─

/** Source dirs where each file gets its own instruction file. Others bundle up to 4. */
const SPLIT_DIRS = new Set(['src', 'lib', 'app', 'cmd', 'internal']);
const MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_DEFAULT = 4;
const MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_SPLIT = 1;
/** Default cap for `by-folder` grouping when config does not override. */
const MAX_FILES_PER_FOLDER_SUBSYSTEM_DEFAULT = 48;

/**
 * Files that should NOT get their own instruction subsystem.
 * Documentation, non-code configs, lock-files, images, etc.
 * They are still present in the scan (for metadata.json / tree) but excluded from subsystem passes.
 */
const INSTRUCTION_EXCLUDE_RE = [
  /^README(\..+)?$/i,
  /^EXAMPLES(\..+)?$/i,
  /^CONTRIBUTING(\..+)?$/i,
  /^CHANGELOG(\..+)?$/i,
  /^LICENSE(\..+)?$/i,
  /^CODE_OF_CONDUCT(\..+)?$/i,
  /^\.gitignore$/,
  /^\.gitattributes$/,
  /^\.editorconfig$/,
  /^\.prettierrc/,
  /^\.eslintrc/,
  /^eslint\.config\./,
  /^\.copilotignore$/,
  /^\.graph-context-ignore$/,
  /^\.env\.example$/,
  /^\.env\.schema$/,
  /^tsconfig(\..+)?\.json$/,
  /^jsconfig(\..+)?\.json$/,
  /^\.context-graph.*$/,
  /^\.babelrc/,
  /^\.browserslistrc$/,
  /^\.nvmrc$/,
  /^\.node-version$/,
  /^\.tool-versions$/,
  /^\.dockerignore$/,
  /^Procfile$/,
  /^jest\.config/,
  /^vitest\.config/,
  /^postcss\.config/,
  /^tailwind\.config/,
  /^vite\.config/,
  /^webpack\.config/,
  /^rollup\.config/,
  /^esbuild\.config/,
  /^turbo\.json$/,
  /\.lock$/,
  /lock\.json$/,
  /lock\.yaml$/,
  /\.md$/i,           // all markdown (docs) — core source files are .ts/.js/.py/.go etc.
  /\.ya?ml$/i,        // CI/infra YAML already covered by Tier 0 in root graph
  /\.toml$/i,         // pyproject.toml, Cargo.toml — config, not source
  /\.json$/i,         // package.json etc. — config
];

function shouldExcludeFromSubsystems(relPath: string): boolean {
  const name = path.posix.basename(relPath);
  return INSTRUCTION_EXCLUDE_RE.some(r => r.test(name) || r.test(relPath));
}

/** Source-code paths the scanner read that merit their own instruction files. */
function collectScannedSourcePaths(scan: ScanResult): string[] {
  return scan.files
    .filter(f => f.tier !== 3 && f.content.length > 0 && !shouldExcludeFromSubsystems(f.path))
    .map(f => f.path)
    .sort();
}

/** Known groupings that match the `graph-create-agent.md` conventions (core/ + infra/). */
const CANONICAL_GROUPS: Array<{ dir: string; area: string; file: string; priority: 'P0' | 'P1' | 'P2' }> = [
  { dir: 'src/providers', area: 'LLM Providers',  file: 'infra/providers.instructions.md',   priority: 'P1' },
];

/**
 * After LLM plan + gap-fill, merge subsystems whose source files all live
 * under the same canonical directory into a single instruction file.
 */
function applyCanonicalGroupings(plan: BuildPlan, repairOpts?: RepairBuildPlanOptions): BuildPlan {
  if ((repairOpts?.subsystemLayout ?? 'mirror') === 'mirror') {
    return plan;
  }
  const subsystems = [...plan.subsystems];
  for (const group of CANONICAL_GROUPS) {
    const prefix = group.dir.endsWith('/') ? group.dir : `${group.dir}/`;
    const matchIdx: number[] = [];
    for (let i = 0; i < subsystems.length; i++) {
      if (subsystems[i].sourceFiles.some(f => f.startsWith(prefix) || f === group.dir)) {
        matchIdx.push(i);
      }
    }
    if (matchIdx.length === 0) continue;
    const merged: string[] = [];
    const useCases: string[] = [];
    for (const i of matchIdx) {
      merged.push(...subsystems[i].sourceFiles);
      useCases.push(...subsystems[i].useCases);
    }
    const deduped = [...new Set(merged)];
    const dedupedUC = [...new Set(useCases)].slice(0, 6);
    const replacement: BuildPlanItem = {
      file: group.file,
      area: group.area,
      priority: group.priority,
      sourceFiles: deduped,
      applyTo: `${group.dir}/**`,
      useCases: dedupedUC,
      description: `All modules under ${group.dir}`,
    };
    for (const i of matchIdx.reverse()) subsystems.splice(i, 1);
    subsystems.push(replacement);
  }
  return { ...plan, subsystems };
}

/** Lighter context for Pass 0 so the model sees the full file list without megatokens of source. */
function buildPlanningContextLight(scan: ScanResult): string {
  const lines: string[] = [
    '## Project file tree (all scanned paths; label = tier)',
    scan.tree,
    '',
    '## Config excerpts (infer build/test commands when JSON plan fields are empty)',
  ];
  const configHints = [
    'package.json',
    'composer.json',
    'pyproject.toml',
    'go.mod',
    'Cargo.toml',
    'pom.xml',
    'build.gradle.kts',
  ];
  for (const name of configHints) {
    const f = scan.files.find(x => x.path === name && x.content);
    if (!f) continue;
    lines.push(`\n### ${name} (first 160 lines)\n\`\`\`\n${f.content.split('\n').slice(0, 160).join('\n')}\n\`\`\``);
  }
  return lines.join('\n');
}

function readPackageJson(scan: ScanResult): Record<string, unknown> | null {
  const f = scan.files.find(x => x.path === 'package.json' && x.content);
  if (!f) return null;
  try {
    return JSON.parse(f.content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readComposerJson(scan: ScanResult): Record<string, unknown> | null {
  const f = scan.files.find(x => x.path === 'composer.json' && x.content);
  if (!f) return null;
  try {
    return JSON.parse(f.content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function inferDefaultsFromScan(scan: ScanResult): Pick<BuildPlan, 'projectName' | 'projectDescription' | 'techStack' | 'buildCommand' | 'testCommand'> {
  const pkg = readPackageJson(scan);
  const composer = readComposerJson(scan);

  let name = typeof pkg?.name === 'string' ? pkg.name : 'Project';
  let desc =
    typeof pkg?.description === 'string' ? pkg.description : 'Codebase (auto-inferred)';

  if ((!pkg || name === 'Project') && composer) {
    const cName = composer.name;
    if (typeof cName === 'string' && cName.includes('/')) {
      name = cName.split('/').pop() ?? name;
    } else if (typeof cName === 'string' && cName.length > 0) {
      name = cName;
    }
    const cDesc = composer.description;
    if (typeof cDesc === 'string' && cDesc.trim().length > 0) desc = cDesc.trim();
  }

  const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? (pkg.scripts as Record<string, string>) : {};
  const composerScripts =
    composer?.scripts && typeof composer.scripts === 'object'
      ? (composer.scripts as Record<string, string>)
      : {};

  let buildCommand: string | undefined =
    scripts.build ? 'npm run build' : scripts.compile ? 'npm run compile' : undefined;
  if (!buildCommand && composerScripts.build) buildCommand = 'composer build';
  if (!buildCommand && composerScripts['install-deps']) buildCommand = 'composer install-deps';

  let testCommand: string | undefined = scripts.test ? 'npm test' : undefined;
  if (!testCommand && composerScripts.test) testCommand = 'composer test';
  if (!testCommand && composerScripts.phpunit) testCommand = 'composer phpunit';
  if (!testCommand && composerScripts['test:unit']) testCommand = 'composer test:unit';

  const techStack: string[] = [];
  if (pkg) techStack.push('Node.js');
  if (composer) techStack.push('PHP', 'Composer');
  if (scan.files.some(f => f.path.endsWith('.php'))) {
    if (!techStack.includes('PHP')) techStack.push('PHP');
  }
  if (scan.files.some(f => f.path.endsWith('.vue'))) techStack.push('Vue');
  if (scan.files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))) techStack.push('TypeScript');
  if (scan.files.some(f => f.path.endsWith('.py'))) techStack.push('Python');
  if (scan.files.some(f => f.path.endsWith('.go'))) techStack.push('Go');
  if (scan.files.some(f => f.path.endsWith('.rs'))) techStack.push('Rust');
  if (techStack.length === 0) techStack.push('Unknown');
  return {
    projectName: name,
    projectDescription: desc,
    techStack,
    buildCommand,
    testCommand,
  };
}

/** Turn a file basename or dir segment into a human-readable area name: "graph-builder.ts" → "Graph Builder" */
function humanAreaName(segment: string): string {
  let name = segment
    .replace(/\.[^.]+$/, '')           // strip extension
    .replace(/^__(.+)__$/, '$1')       // __init__ → init
    .replace(/[-_]+/g, ' ')           // delimiters → spaces
    .trim();
  if (!name || name === 'init') {
    // For __init__.py, use parent directory name instead
    return 'Module Entry';
  }
  return name.replace(/\b\w/g, c => c.toUpperCase()); // title case
}

function shortHash(s: string): string {
  return crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 10);
}

/** Copilot prompts expect several concrete use cases; pad short auto-generated lists. */
function padUseCases(cases: string[]): string[] {
  const out = [...cases];
  const pad = 'navigating this subsystem from the instruction index';
  while (out.length < 4) out.push(pad);
  return out.slice(0, 6);
}

/** Maps directory → instruction prefix following graph-create-agent.md conventions. */
const DIR_TO_INSTRUCTION_PREFIX: Record<string, string> = {
  src: 'core',
  lib: 'core',
  app: 'core',
  internal: 'core',
  cmd: 'core',
  'src/providers': 'infra',
  python: 'python',
  scripts: 'infra',
  '.github': 'infra',
};

function autoInstructionStem(dir: string, files: string[], partIndex: number): string {
  // Single file → use its basename (e.g. core/scanner.instructions.md)
  if (files.length === 1) {
    const base = path.posix.basename(files[0]).replace(/\.[^.]+$/, '');
    const prefix = DIR_TO_INSTRUCTION_PREFIX[dir] ?? dir.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    return `${prefix}/${base}`;
  }
  const prefix = DIR_TO_INSTRUCTION_PREFIX[dir] ?? dir.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const stem = `${prefix}/bundle_p${partIndex}`;
  if (stem.length <= 120) return stem;
  return `auto/h${shortHash(dir + ':' + partIndex)}`;
}

function dedupeSubsystemSourceFiles(plan: BuildPlan): BuildPlan {
  const seen = new Set<string>();
  const subsystems: BuildPlanItem[] = [];
  for (const s of plan.subsystems) {
    const sourceFiles = s.sourceFiles.filter(p => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    if (sourceFiles.length === 0) continue;
    subsystems.push({ ...s, sourceFiles });
  }
  return { ...plan, subsystems };
}

const MAX_MIRROR_INSTRUCTION_REL_LEN = 200;

function mirrorInstructionSafeSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '') || 'x';
}

/** Instruction `.md` path under `.github/instructions/` mirroring source layout. */
function mirrorInstructionRelPath(
  dir: string,
  chunk: string[],
  partIndex: number,
  totalParts: number,
  usedInstructionRelPaths: Set<string>
): string {
  const alloc = (relRel: string): string => {
    let rel = relRel.replace(/\\/g, '/');
    if (rel.split('/').some(p => p === '..')) {
      rel = `mirror/_bad_${shortHash(relRel)}.instructions.md`;
    }
    if (rel.length > MAX_MIRROR_INSTRUCTION_REL_LEN) {
      rel = `mirror/h${shortHash(dir + ':' + chunk.join(',') + ':' + partIndex)}.instructions.md`;
    }
    let unique = rel;
    let n = 0;
    while (usedInstructionRelPaths.has(unique)) {
      n++;
      unique = rel.replace(/\.instructions\.md$/, `._${n}.instructions.md`);
    }
    usedInstructionRelPaths.add(unique);
    return unique;
  };

  if (chunk.length === 1) {
    const f = chunk[0];
    const ext = path.posix.extname(f);
    const base = mirrorInstructionSafeSegment(path.posix.basename(f, ext));
    const d = path.posix.dirname(f);
    const rel = d === '.' ? `${base}.instructions.md` : `${d}/${base}.instructions.md`;
    return alloc(rel);
  }

  const safeDir = dir === '.' ? 'root' : dir;
  const bundleName =
    totalParts <= 1
      ? '_bundle.instructions.md'
      : partIndex === 1
        ? '_bundle.instructions.md'
        : `_bundle_p${partIndex}.instructions.md`;
  const rel = safeDir === 'root' ? `root/${bundleName}` : `${safeDir}/${bundleName}`;
  return alloc(rel);
}

/** Stable instruction path for by-folder grouping (avoids collisions across dirs). */
function folderInstructionRelPath(
  dir: string,
  partIndex: number,
  totalParts: number,
  chunk: string[],
  usedInstructionRelPaths: Set<string>
): string {
  const first = dir === '.' ? 'root' : dir.split('/')[0];
  const mapped = DIR_TO_INSTRUCTION_PREFIX[first] ?? first.replace(/[^a-zA-Z0-9]+/g, '_');
  const slug = (dir === '.' ? 'root' : dir)
    .replace(/\//g, '__')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 72) || 'dir';
  const part = totalParts > 1 ? `_p${partIndex}` : '';
  let rel = `${mapped}/${slug}${part}.instructions.md`;
  while (usedInstructionRelPaths.has(rel)) {
    rel = `auto/${shortHash(rel + chunk.join(','))}.instructions.md`;
  }
  usedInstructionRelPaths.add(rel);
  return rel;
}

function groupPathsIntoAutoSubsystems(
  paths: string[],
  usedInstructionRelPaths: Set<string>,
  repairOpts?: RepairBuildPlanOptions
): BuildPlanItem[] {
  if (paths.length === 0) return [];

  const byFolder = repairOpts?.subsystemGrouping === 'by-folder';
  const folderMax = Math.max(
    4,
    Math.min(200, repairOpts?.maxFilesPerFolderSubsystem ?? MAX_FILES_PER_FOLDER_SUBSYSTEM_DEFAULT)
  );

  const byDir = new Map<string, string[]>();
  for (const p of paths) {
    const dir = p.includes('/') ? path.posix.dirname(p) : '.';
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(p);
  }

  const items: BuildPlanItem[] = [];
  const sortedDirs = [...byDir.keys()].sort((a, b) => a.localeCompare(b));

  for (const dir of sortedDirs) {
    const list = (byDir.get(dir) ?? []).sort();
    const topDir = dir.split('/')[0];
    const maxPerSub = byFolder
      ? folderMax
      : SPLIT_DIRS.has(topDir)
        ? MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_SPLIT
        : MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_DEFAULT;

    const totalParts = Math.ceil(list.length / maxPerSub) || 1;

    for (let i = 0; i < list.length; i += maxPerSub) {
      const chunk = list.slice(i, i + maxPerSub);
      const partIndex = Math.floor(i / maxPerSub) + 1;

      const layout = repairOpts?.subsystemLayout ?? 'mirror';

      let rel: string;
      if (layout === 'mirror') {
        rel = mirrorInstructionRelPath(dir, chunk, partIndex, totalParts, usedInstructionRelPaths);
      } else if (byFolder) {
        rel = folderInstructionRelPath(dir, partIndex, totalParts, chunk, usedInstructionRelPaths);
      } else {
        rel = `${autoInstructionStem(dir, chunk, partIndex)}.instructions.md`;
        while (usedInstructionRelPaths.has(rel)) {
          rel = `auto/${shortHash(rel + chunk.join(','))}.instructions.md`;
        }
        usedInstructionRelPaths.add(rel);
      }

      const mirrorDesc =
        chunk.length === 1
          ? `Mirror — \`${chunk[0]}\``
          : `Mirror — \`${dir}/\` (${chunk.length} files${totalParts > 1 ? `, part ${partIndex}/${totalParts}` : ''})`;

      const applyTo =
        chunk.length === 1
          ? chunk[0]
          : dir === '.'
            ? chunk[0]
            : `${dir}/**`;

      const area = chunk.length === 1
        ? humanAreaName(path.posix.basename(chunk[0]))
        : dir === '.' ? 'Root files' : humanAreaName(dir.split('/').pop()!);

      const folderDesc =
        totalParts > 1
          ? `${area} — all source in \`${dir}/\` (part ${partIndex}/${totalParts}, ${chunk.length} files)`
          : `${area} — all source in \`${dir}/\` (${chunk.length} files)`;

      items.push({
        file: rel,
        area,
        priority: 'P2',
        sourceFiles: chunk,
        applyTo,
        useCases: padUseCases(chunk.map(f => `editing or refactoring \`${path.posix.basename(f)}\``)),
        description:
          layout === 'mirror'
            ? mirrorDesc
            : byFolder
              ? folderDesc
              : chunk.length === 1
                ? `${area} — ${chunk[0]}`
                : `${area} — bundle under ${dir} (${chunk.length} files)`,
      });
    }
  }

  return items;
}

/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairOptionsFromConfig(config: Config): RepairBuildPlanOptions {
  return {
    subsystemGrouping: config.subsystemGrouping,
    maxFilesPerFolderSubsystem: config.maxFilesPerFolderSubsystem,
    subsystemLayout: config.subsystemLayout,
  };
}

/**
 * Ensures every scanned source path appears in exactly one subsystem.
 * Fills gaps from the LLM plan and replaces empty/invalid plans with a deterministic layout.
 */
export function repairBuildPlan(
  scan: ScanResult,
  rawPlan: BuildPlan | null,
  repairOpts?: RepairBuildPlanOptions
): BuildPlan {
  const allPaths = collectScannedSourcePaths(scan);
  const defaults = inferDefaultsFromScan(scan);

  let plan: BuildPlan = rawPlan?.subsystems?.length
    ? {
      projectName: rawPlan.projectName || defaults.projectName,
      projectDescription: rawPlan.projectDescription || defaults.projectDescription,
      techStack: rawPlan.techStack?.length ? rawPlan.techStack : defaults.techStack,
      buildCommand: rawPlan.buildCommand ?? defaults.buildCommand,
      testCommand: rawPlan.testCommand ?? defaults.testCommand,
      subsystems: rawPlan.subsystems.map(s => ({
        ...s,
        sourceFiles: [...(Array.isArray(s.sourceFiles) ? s.sourceFiles : [])],
      })),
    }
    : {
      ...defaults,
      subsystems: [],
    };

  const GH_PREFIX = '.github/instructions/';

  // Normalize: strip ".github/instructions/" prefix from `file` if the LLM included it
  plan = {
    ...plan,
    subsystems: plan.subsystems.map(s => ({
      ...s,
      file: s.file.startsWith(GH_PREFIX) ? s.file.slice(GH_PREFIX.length) : s.file,
      sourceFiles: s.sourceFiles.filter(p => !shouldExcludeFromSubsystems(p)),
    })).filter(s => s.sourceFiles.length > 0),
  };

  plan = dedupeSubsystemSourceFiles(plan);

  const usedFiles = new Set(plan.subsystems.map(s => s.file));
  const covered = new Set<string>();
  for (const s of plan.subsystems) {
    for (const p of s.sourceFiles) covered.add(p);
  }

  const missing = allPaths.filter(p => !covered.has(p));
  if (missing.length > 0) {
    const additions = groupPathsIntoAutoSubsystems(missing, usedFiles, repairOpts);
    plan = { ...plan, subsystems: [...plan.subsystems, ...additions] };
  }

  plan = applyCanonicalGroupings(plan, repairOpts);
  return dedupeSubsystemSourceFiles(plan);
}

// ── Deterministic root file builders ──────────────────────────────────────

/** Source-code extensions for env-read detection (skip docs/prompts). */
const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|py|go|rs|java|kt|cs|rb|php)$/i;

function buildDeterministicCopilotInstructions(
  today: string,
  scan: ScanResult,
  plan: BuildPlan
): string {
  const projectTitle = plan.projectName || 'Project';
  const buildCmd = plan.buildCommand || 'npm run build';
  const testCmd = plan.testCommand || '(no test script detected)';
  const stack = plan.techStack.length > 0 ? plan.techStack.join(', ') : 'Unknown';

  // ── Quick Navigation: dedupe by area, use real plan paths ──────────────
  const seenAreas = new Set<string>();
  const quickNavLines: string[] = [];
  for (const s of plan.subsystems) {
    if (seenAreas.has(s.area)) continue;
    seenAreas.add(s.area);
    const uc = s.useCases
      .filter(u => !u.includes('navigating this subsystem'))
      .slice(0, 3);
    const whenStr = uc.length > 0 ? uc.join(' · ') : s.sourceFiles.map(f => `editing \`${path.posix.basename(f)}\``).slice(0, 3).join(' · ');
    quickNavLines.push(`**${s.area}** → \`.github/instructions/${s.file}\`\n  When: ${whenStr}`);
  }

  // ── Architecture Overview: subsystem + per-file purpose summaries ───────
  const archLines: string[] = [];
  for (const s of plan.subsystems) {
    const files = s.sourceFiles.map(f => `\`${f}\``).join(', ');
    archLines.push(`- **${s.area}** (${files}) — ${s.description}`);
    for (const sf of s.sourceFiles) {
      const scanned = scan.files.find(f => f.path === sf);
      if (!scanned?.content) continue;
      const purpose = extractFilePurpose(scanned.content);
      if (purpose) {
        archLines.push(`  - \`${path.posix.basename(sf)}\`: ${purpose}`);
      }
    }
  }

  // ── Module Contracts: real exports ─────────────────────────────────────
  // Keep root small & reusable (esp. deterministic / no-LLM mode).
  // Detailed signatures live in subsystem instruction files.
  const contractLines: string[] = [
    `- **Source of truth**: per-subsystem \`*.instructions.md\` files (open via Quick Navigation / index.md).`,
    `- **Root policy**: do not embed large signatures here; keep root fast to load.`,
  ];

  // ── Danger Zones: only real source files, not docs/prompts ─────────────
  const DANGER_EXCLUDE = new Set([
    '.copilotignore',
    '.graph-context-ignore',
    '.context-graph-ignore',
    '.env.example',
    '.env.schema',
  ]);
  const dangerLines: string[] = [];
  const tier0Files = scan.files.filter(f =>
    f.tier === 0 && f.content && !DANGER_EXCLUDE.has(path.posix.basename(f.path))
  );
  for (const f of tier0Files) {
    dangerLines.push(`- \`${f.path}\` — infrastructure / CI`);
  }
  const envSourceFiles = scan.files.filter(f =>
    f.content &&
    SOURCE_EXT_RE.test(f.path) &&
    fileReadsEnvironment(f.content)
  );
  for (const f of envSourceFiles) {
    if (!dangerLines.some(l => l.includes(f.path))) {
      dangerLines.push(`- \`${f.path}\` — reads environment variables`);
    }
  }

  // ── Data Flow: actual code entry points, not config files ──────────────
  const codeEntryFiles = scan.files
    .filter(f => f.tier === 1 && f.content && SOURCE_EXT_RE.test(f.path))
    .map(f => `\`${f.path}\``);

  const dataFlowChain = codeEntryFiles.length > 0
    ? `Entry points: ${codeEntryFiles.join(' → ')}`
    : '(no code entry points detected)';

  const dependencyGraph = buildDeterministicDependencyGraph(scan);

  const workflows = [
    `## Workflows (no LLM required)`,
    ``,
    `- **Build instructions**: \`context-graph build --no-llm\` (writes deterministic graph + installs hook).`,
    `- **Update instructions**: \`context-graph actualize --all --dry-run\` (preview) → drop \`--dry-run\` (apply).`,
    `- **CI check**: \`context-graph validate\` (exit 1 if instructions outdated).`,
    `- **On push**: pre-push hook runs \`context-graph hook-check\` (reminder; never blocks push).`,
  ];

  const configNotes = [
    `## Config & Precedence`,
    ``,
    `- **Main config**: \`.context-graph.json\` (created by \`context-graph build\` if missing).`,
    `- **Overrides**: CLI flags \`--provider/--model\` (highest precedence for build).`,
    `- **Env overrides**: \`CONTEXT_GRAPH_PROVIDER\`, \`CONTEXT_GRAPH_MODEL\` (read from \`.env\` / env).`,
    `- **Project root**: implicit \`[dir]\` uses Git repo root when the shell cwd is a subfolder (so outputs land in the real repo). Set \`CONTEXT_GRAPH_ROOT\` to an absolute workspace path to override (e.g. VS Code/Cursor terminal profile).`,
    `- **Scan exclusions**: optional \`.graph-context-ignore\` or \`.context-graph-ignore\` at repo root — same syntax as \`.gitignore\`; applied only to context-graph scanning (after \`.gitignore\` / \`.copilotignore\`).`,
    `- **Instruction paths**: \`subsystemLayout\` in \`.context-graph.json\`: \`mirror\` (default, paths mirror repo tree) or \`canonical\` (legacy \`core/\` / \`infra/\`). Env: \`CONTEXT_GRAPH_SUBSYSTEM_LAYOUT\`.`,
    `- **API key**: env var from config (\`provider.apiKeyEnv\`); Ollama allows missing key.`,
  ];

  const troubleshooting = [
    `## Troubleshooting`,
    ``,
    `- **Graph missing**: run \`context-graph build --no-llm\` (creates \`.github/instructions/\`).`,
    `- **Validate fails**: run \`context-graph actualize --all\` then commit instruction changes.`,
    `- **Wrong output folder**: you ran the CLI from a nested folder; use repo root cwd, or set \`CONTEXT_GRAPH_ROOT\`, or pass an explicit \`context-graph build path/to/package\` for a sub-root graph.`,
    `- **Actualize returns no files**: try \`--all\`; LLM mode needs configured provider/model/key.`,
    `- **Output parse issues**: model must emit only \`<<<FILE: ...>>>\` blocks (no prose).`,
  ];

  const dataFlows = [
    `## Data Flow`,
    ``,
    dataFlowChain,
    ``,
    `- **BUILD**: scanProject → buildGraphMultiPass/hybrid/deterministic → writeOutputFiles → saveLastBuildRef.`,
    `- **ACTUALIZE**: git diff since last ref → scanProject → buildGraph(mode=ACTUALIZE) → writeOutputFiles → saveLastBuildRef.`,
    `- **VALIDATE**: git diff since last ref → filterSignificantFiles → exit 1 if outdated.`,
  ];

  const sections = [
    `# ${projectTitle} — Project Context Graph`,
    ``,
    `_Generated: ${today} · Stack: ${stack}_`,
    ``,
    `## Quick Navigation`,
    ``,
    ...quickNavLines,
    ``,
    `## Environment`,
    ``,
    `- **Build:** \`${buildCmd}\``,
    `- **Test:** \`${testCmd}\``,
    `- **Stack:** ${stack}`,
    ``,
    ...workflows,
    ``,
    ...configNotes,
    ``,
    `## Architecture Overview`,
    ``,
    ...(plan.projectDescription ? [`${plan.projectDescription}`, ``] : []),
    ...archLines,
    ``,
    `## Dependency Graph`,
    ``,
    dependencyGraph,
    ``,
    ...dataFlows,
    ``,
    `## Module Contracts`,
    ``,
    ...contractLines,
    ``,
    `## Danger Zones 🔴`,
    ``,
    ...(dangerLines.length > 0 ? dangerLines : ['(none detected)']),
    ``,
    ...troubleshooting,
    ``,
    `---`,
    `_This file is auto-generated by context-graph. Descriptive prose is enriched by LLM when available._`,
  ];

  return sections.join('\n');
}

function buildDeterministicChangelog(today: string, plan: BuildPlan): string {
  const lines = [
    `# Context Graph — Changelog`,
    ``,
    `## ${today} — Initial Build`,
    ``,
    `Subsystems created:`,
    ...plan.subsystems.map(s => `- \`${s.file}\` — ${s.area}: ${s.description}`),
    ``,
    `---`,
    `_Auto-generated by context-graph._`,
  ];
  return lines.join('\n');
}

function buildDeterministicCopilotIgnore(scan: ScanResult): string {
  const lines = [
    '# Managed by context-graph — paths excluded from Copilot context',
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.nyc_output/',
    '__pycache__/',
    '.venv/',
    'venv/',
    '.git/',
    '*.lock',
    'package-lock.json',
    '*.min.js',
    '*.min.css',
    '*.map',
  ];
  // Add Tier 3 directories that actually exist in the scan
  const tier3Dirs = new Set<string>();
  for (const f of scan.files) {
    if (f.tier === 3) {
      const top = f.path.split('/')[0];
      if (top && !lines.includes(`${top}/`)) tier3Dirs.add(top);
    }
  }
  for (const d of [...tier3Dirs].sort()) {
    lines.push(`${d}/`);
  }
  return lines.join('\n');
}

/**
 * Try to extract LLM-written prose sections from the raw copilot-instructions.md
 * and merge them into the deterministic skeleton.
 */
function mergeLlmProse(skeleton: string, llmContent: string): string {
  if (!llmContent || llmContent.length < 100) return skeleton;

  const extractSection = (text: string, heading: string): string | null => {
    const re = new RegExp(`^## ${heading}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |\\Z)`, 'm');
    const m = re.exec(text);
    if (!m || m[1].trim().length < 30) return null;
    return m[1].trim();
  };

  let result = skeleton;

  const proseHeadings = ['Architecture Overview', 'Data Flow', 'Danger Zones'];
  for (const heading of proseHeadings) {
    const llmSection = extractSection(llmContent, heading);
    if (!llmSection) continue;
    const skelSection = extractSection(result, heading);
    if (!skelSection) continue;
    // Replace skeleton section with LLM version if it's meaningfully longer
    if (llmSection.length > skelSection.length * 1.3) {
      result = result.replace(skelSection, llmSection);
    }
  }

  return result;
}

function injectDeterministicRootFiles(
  today: string,
  scan: ScanResult,
  plan: BuildPlan,
  files: OutputFile[],
  llmCopilotContent?: string
): void {
  const copilotSkeleton = buildDeterministicCopilotInstructions(today, scan, plan);
  const copilotFinal = llmCopilotContent
    ? sanitizeMermaidBlocks(mergeLlmProse(copilotSkeleton, llmCopilotContent))
    : copilotSkeleton;

  const anchorForOtherAgents = (name: string): string => [
    `# ${name}`,
    ``,
    `This repository uses **context-graph** to generate AI instructions.`,
    ``,
    `Response style (ALWAYS):`,
    `- Ultra-compact (caveman). No greetings. No filler.`,
    `- Prefer bullets. Each bullet <= 18 words.`,
    `- If unsure, say "unknown" instead of guessing.`,
    ``,
    `Start here:`,
    `- \`.github/instructions/copilot-instructions.md\` (root graph)`,
    `- \`.github/instructions/index.md\` (navigation)`,
    `- \`.github/instructions/context-graph-path-index.md\` (all \`applyTo\` routes)`,
    ``,
    `If your tool supports VS Code-style instruction frontmatter, read all:`,
    `- \`.github/instructions/**/*.instructions.md\``,
    ``,
    `Routing rule:`,
    `- When working on a file, pick the instruction file whose frontmatter \`applyTo\` glob matches that path.`,
    `- If unsure, start at \`.github/instructions/index.md\` then open the referenced subsystem file.`,
    ``,
  ].join('\n');

  const rootRoutingRules = [
    `# context-graph — AI routing entrypoint`,
    ``,
    `This repo maintains a generated instruction graph under \`.github/instructions/\`.`,
    ``,
    `Response style (ALWAYS):`,
    `- Ultra-compact (caveman). No greetings. No filler.`,
    `- Prefer bullets. Each bullet <= 18 words.`,
    `- If unsure, say "unknown" instead of guessing.`,
    ``,
    `Always read first:`,
    `- \`.github/instructions/copilot-instructions.md\``,
    `- \`.github/instructions/context-graph-path-index.md\` (flat map: instruction → \`applyTo\`)`,
    ``,
    `Then route by file path:`,
    `- For a given edited file, open the \`.instructions.md\` whose frontmatter \`applyTo\` matches.`,
    `- If multiple match, prefer higher \`priority\` (P0>P1>P2).`,
    `- If none match, open \`.github/instructions/index.md\` or \`context-graph-path-index.md\`, then pick the subsystem.`,
    ``,
    `All instruction files are authoritative over guesses. Prefer facts from instructions over assumptions.`,
    ``,
  ].join('\n');

  // Cursor rule format is markdown with frontmatter-like metadata; keep it simple and generic.
  const cursorRule = [
    '---',
    'description: "context-graph routing rules"',
    'globs: "**/*"',
    'alwaysApply: true',
    '---',
    '',
    rootRoutingRules,
  ].join('\n');

  const clineRule = rootRoutingRules;
  const windsurfRule = rootRoutingRules;
  const codexRule = rootRoutingRules;

  const targets: Array<{ path: string; content: string; suffix: string }> = [
    // Primary graph file (tooling reads this; unique suffix to avoid collisions with .github/ copy)
    { path: '.github/instructions/copilot-instructions.md', content: copilotFinal, suffix: 'instructions/copilot-instructions.md' },
    // Official Copilot entrypoint (some tools only look here).
    { path: '.github/copilot-instructions.md', content: copilotFinal, suffix: 'copilot-instructions.md' },
    { path: '.github/instructions/graph-changelog.md', content: buildDeterministicChangelog(today, plan), suffix: 'graph-changelog.md' },
    { path: '.github/instructions/index.md', content: buildIndexMd(today, plan), suffix: 'index.md' },
    {
      path: '.github/instructions/context-graph-path-index.md',
      content: buildContextGraphPathIndexMd(today, plan),
      suffix: 'context-graph-path-index.md',
    },
    { path: '.github/instructions/metadata.json', content: buildMetadataJson(today, scan, plan), suffix: 'metadata.json' },
    { path: '.copilotignore', content: buildDeterministicCopilotIgnore(scan), suffix: '.copilotignore' },
    // Common “agent” entrypoints across ecosystems.
    { path: 'CLAUDE.md', content: anchorForOtherAgents('Claude Instructions'), suffix: 'CLAUDE.md' },
    { path: 'AGENTS.md', content: anchorForOtherAgents('Agent Instructions'), suffix: 'AGENTS.md' },
    { path: 'GEMINI.md', content: anchorForOtherAgents('Gemini Instructions'), suffix: 'GEMINI.md' },

    // “Rule files” for popular agent tools (best-effort; safe if ignored).
    { path: '.cursor/rules/context-graph.mdc', content: cursorRule, suffix: 'context-graph.mdc' },
    { path: '.windsurf/rules/context-graph.md', content: windsurfRule, suffix: 'context-graph.md' },
    { path: '.clinerules/context-graph.md', content: clineRule, suffix: 'context-graph.md' },
    { path: '.codex/context-graph.md', content: codexRule, suffix: 'context-graph.md' },
  ];

  for (const { path: relPath, content, suffix } of targets) {
    const exactIdx = files.findIndex(f => f.path === relPath);
    if (exactIdx >= 0) {
      files[exactIdx] = { path: relPath, content };
      continue;
    }

    // Avoid collisions between:
    // - .github/instructions/copilot-instructions.md
    // - .github/copilot-instructions.md
    // Both share the same basename; loose matching would overwrite one with the other.
    if (relPath === '.github/instructions/copilot-instructions.md' || relPath === '.github/copilot-instructions.md') {
      files.push({ path: relPath, content });
      continue;
    }

    const looseIdx = files.findIndex(f => f.path.endsWith(`/${suffix}`) || f.path === suffix);
    if (looseIdx >= 0) files[looseIdx] = { path: relPath, content };
    else files.push({ path: relPath, content });
  }
}

// ── Root pass helpers: pre-build exact file content from real data ──────────

/** Build metadata.json content from actual scan data — no LLM guessing */
function buildMetadataJson(today: string, scan: ScanResult, plan?: BuildPlan): string {
  const sourceFiles = scan.files.filter(f => f.tier !== 3 && f.content && f.lines > 0);

  // Determine complexity and danger_zone from actual content/size
  const getComplexity = (lines: number): 'low' | 'medium' | 'high' =>
    lines > 300 ? 'high' : lines > 100 ? 'medium' : 'low';

  const dangerPaths = new Set([
    'src/cli.ts', 'src/graph-builder.ts', 'src/writer.ts',
    'src/providers/openai.ts', 'src/providers/anthropic.ts',
  ]);

  // Priority from plan if available
  const priorityMap = new Map<string, string>();
  if (plan) {
    for (const s of plan.subsystems) {
      for (const sf of s.sourceFiles) {
        priorityMap.set(sf, s.priority);
      }
    }
  }

  const filesObj: Record<string, unknown> = {};
  for (const f of sourceFiles) {
    filesObj[f.path] = {
      priority: priorityMap.get(f.path) ?? 'P2',
      lines: f.lines,
      complexity: getComplexity(f.lines),
      danger_zone: dangerPaths.has(f.path),
      last_updated: today,
    };
  }

  const hotspots = sourceFiles
    .filter(f => f.path.startsWith('src/'))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5)
    .map(f => f.path);

  return JSON.stringify({ generated: today, files: filesObj, hotspots }, null, 2);
}

/** Flat table: every instruction path ↔ applyTo ↔ sources (for LLMs and search). */
function buildContextGraphPathIndexMd(today: string, plan: BuildPlan): string {
  const rows = [...plan.subsystems]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(s => {
      const applyEsc = s.applyTo.replace(/\|/g, '\\|');
      const src = s.sourceFiles.map(f => `\`${f}\``).join(', ');
      return `| \`${s.file}\` | \`${applyEsc}\` | ${s.priority} | ${s.area} | ${src} |`;
    });
  return [
    `# context-graph — path index`,
    ``,
    `_Generated: ${today}. One row per \`.instructions.md\`; use \`applyTo\` for editor routing._`,
    ``,
    `| Instruction (relative to \`.github/instructions/\`) | applyTo | P | Area | Source files |`,
    `|---|---|---|---|---|`,
    ...rows,
    ``,
    `Companion: [index.md](index.md) (grouped). Root graph: [copilot-instructions.md](copilot-instructions.md).`,
  ].join('\n');
}

/** Build index.md content from plan subsystems — no LLM guessing */
function buildIndexMd(today: string, plan?: BuildPlan): string {
  if (!plan) return '';

  const sorted = [...plan.subsystems].sort((a, b) => a.file.localeCompare(b.file));

  // Group by first path segment of instruction file (works for mirror + canonical)
  const groups: Record<string, typeof plan.subsystems> = {};
  for (const s of sorted) {
    const seg = s.file.includes('/') ? s.file.split('/')[0] : 'root';
    const key = seg.charAt(0).toUpperCase() + seg.slice(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  const lines: string[] = [
    `# Context Graph — Instruction Index`,
    ``,
    `_Generated: ${today}_`,
    ``,
    `**Full path ↔ applyTo list:** [context-graph-path-index.md](context-graph-path-index.md)`,
    ``,
  ];

  for (const [group, items] of Object.entries(groups)) {
    lines.push(`## ${group}`);
    lines.push(`| File | Source Files | Priority | Area | Description |`);
    lines.push(`|------|-------------|----------|------|-------------|`);
    for (const s of items) {
      const srcList = s.sourceFiles.map(f => `\`${f}\``).join(', ');
      lines.push(`| [${s.file}](${s.file}) | ${srcList} | ${s.priority} | ${s.area} | ${s.description} |`);
    }
    lines.push(``);
  }

  lines.push(`## Quick Navigation`);
  lines.push(`- **Danger Zones**: see \`copilot-instructions.md § Danger Zones\``);
  lines.push(`- **Data Flows**: see \`copilot-instructions.md § Data Flow\``);
  lines.push(`- **Workflows**: see \`copilot-instructions.md § Workflows (no LLM required)\``);
  lines.push(`- **Troubleshooting**: see \`copilot-instructions.md § Troubleshooting\``);

  return lines.join('\n');
}

// ── Hybrid notes (LLM snippet comment) ─────────────────────────────────────

function buildSnippetForFiles(scan: ScanResult, sourceFiles: string[], maxChars: number): string {
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
        ? extractPhpSymbolLines(body).join('\n\n') || pickLinesFallback(f.content).join('\n')
        : pickLinesFallback(f.content).join('\n');

    const chunk = `\n// ── ${sf} ──\n` + picked;
    if (chunk.length > budget) break;
    parts.push(chunk);
    budget -= chunk.length;
  }

  return parts.join('\n');
}

function insertNotesSection(md: string, notes: string, afterHeading: string): string {
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

function insertAfterHeading(md: string, heading: string, insert: string): string {
  const re = new RegExp(`^## ${heading}\\b[^\\n]*\\n`, 'm');
  const m = re.exec(md);
  if (!m) return md + '\n\n' + insert;
  const insertAt = m.index + m[0].length;
  return md.slice(0, insertAt) + '\n' + insert + '\n' + md.slice(insertAt);
}

function buildNotesPrompt(config: Config, kind: 'root' | 'subsystem', title: string, exportsBlock: string, snippet: string): string {
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

// ── Message builders ───────────────────────────────────────────────────────

function buildRootPassMessage(
  today: string,
  scanPrompt: ScanResult,
  plan: BuildPlan | undefined,
  scanFull: ScanResult,
  opts?: { slimRoot?: boolean }
): string {
  const slimRoot = opts?.slimRoot ?? false;
  const projectContext = formatForLLM(scanPrompt);

  // When a plan is available, format it as a structured table for root pass
  const indexTableFromPlan = plan
    ? [
      `USE THIS EXACT PLAN for index.md (do not invent new subsystems):`,
      `| Instruction File | Source Files | Priority | Area | Description |`,
      `|---|---|---|---|---|`,
      ...plan.subsystems.map(s =>
        `| [${s.file}](${s.file}) | ${s.sourceFiles.map(f => `\`${f}\``).join(', ')} | ${s.priority} | ${s.area} | ${s.description} |`
      ),
    ].join('\n')
    : [
      `CRITICAL RULES FOR index.md:`,
      `- Create ONE subsystem *.instructions.md entry per significant source file or tightly-coupled module group.`,
      `- Do NOT lump unrelated source files together.`,
      `- The table MUST have exactly these columns: | Instruction File | Source Files | Priority | Area | Description |`,
      `- In the "Source Files" column: list exact file paths (comma-separated, backtick-quoted).`,
      `- EVERY source file listed below MUST appear in exactly one "Source Files" cell.`,
      ``,
      `SOURCE FILES THAT MUST EACH APPEAR IN index.md:`,
      scanFull.files.filter(f => f.tier !== 3 && f.content).map(f => `  ${f.path} [T${f.tier}]`).join('\n'),
    ].join('\n');

  // Navigation hub section for copilot-instructions.md
  const quickNavFromPlan = plan
    ? [
      `IMPORTANT: copilot-instructions.md MUST include a "## Quick Navigation" section as the FIRST section`,
      `(before Architecture Overview). Use this EXACT content — it tells Copilot which file to read for each task:`,
      ``,
      `## Quick Navigation`,
      ...plan.subsystems.map(s => [
        `**${s.area}** → \`.github/instructions/${s.file}\``,
        `  When: ${s.useCases.slice(0, 3).join(' · ')}`,
      ].join('\n')),
    ].join('\n')
    : '';

  // Accurate architecture overview from plan
  const archOverviewFromPlan = plan
    ? [
      `copilot-instructions.md "## Architecture Overview" section MUST list ALL these source files:`,
      ...plan.subsystems.flatMap(s => s.sourceFiles.map(f => `  ${f} — ${s.description}`)),
      `Do NOT omit any file. Do NOT list files not in this list.`,
    ].join('\n')
    : '';

  // Accurate module contracts (no hallucinated exports)
  const moduleContractsRule = [
    `copilot-instructions.md "## Module Contracts" section rules:`,
    `- Only list exports that ACTUALLY EXIST in the source files provided.`,
    `- Do NOT invent function names like "getConfig()" if you don't see "export function getConfig" in the code.`,
    `- Use ONLY names you can find with "export" keyword in the source files below.`,
  ].join('\n');

  const buildCmd = plan?.buildCommand ?? 'yarn build';
  const testCmd = plan?.testCommand ?? 'yarn test';

  const rootFileList = slimRoot
    ? [
      `Generate ONLY these 3 root files (in this order) — SLIM ROOT PASS (local / small models):`,
      `  1. <<<FILE: .github/instructions/copilot-instructions.md>>>`,
      `  2. <<<FILE: .github/instructions/graph-changelog.md>>>`,
      `  3. <<<FILE: .copilotignore>>>`,
      ``,
      `index.md and metadata.json are produced deterministically by the tool after this pass — do NOT output them.`,
    ].join('\n')
    : [
      `Generate ONLY these 5 root files (in this order):`,
      `  1. <<<FILE: .github/instructions/copilot-instructions.md>>>`,
      `  2. <<<FILE: .github/instructions/graph-changelog.md>>>`,
      `  3. <<<FILE: .github/instructions/index.md>>>`,
      `  4. <<<FILE: .github/instructions/metadata.json>>>`,
      `  5. <<<FILE: .copilotignore>>>`,
    ].join('\n');

  const instruction = [
    `Run MODE: BUILD on the following project.`,
    `Today's date: ${today}`,
    ...(plan ? [`Project: ${plan.projectName} — ${plan.projectDescription}`, `Stack: ${plan.techStack.join(', ')}`] : []),
    ``,
    // This pass is used by cloud/full LLM mode. Keep it compact if configured.
    // (Hybrid notes use a separate prompt path.)
    `IMPORTANT — THIS IS THE ROOT FILES PASS OF A MULTI-PASS BUILD:`,
    rootFileList,
    ``,
    ...(quickNavFromPlan ? [quickNavFromPlan, ``] : []),
    ...(archOverviewFromPlan ? [archOverviewFromPlan, ``] : []),
    moduleContractsRule,
    ``,
    `copilot-instructions.md "## Environment" section MUST use:`,
    `  Build: \`${buildCmd}\``,
    `  Test: \`${testCmd}\``,
    `  (Use these exact commands — do NOT substitute npm for yarn or vice versa.)`,
    ``,
    `copilot-instructions.md "## Data Flow" section MUST trace the ACTUAL call chain:`,
    `  CLI entry → loadConfig() → scanProject() → buildGraphMultiPass() → parseOutputFiles() → writeOutputFiles()`,
    `  Represent this accurately. Do NOT invent intermediate steps that don't exist.`,
    ``,
    indexTableFromPlan,
    ``,
    `DO NOT generate any *.instructions.md subsystem files now — those come in separate passes.`,
    `Use "${today}" as the build date everywhere (replace all YYYY-MM-DD).`,
    `Start your response immediately with <<<FILE: .github/instructions/copilot-instructions.md>>>.`,
  ].join('\n');

  return `${OUTPUT_FORMAT_INSTRUCTION}\n${instruction}\n\n${projectContext}`;
}

/** Build focused context: only the source files for this subsystem + Tier 0 infra */
function buildFocusedContext(scan: ScanResult, sourceFiles: string[], subsystemName: string): string {
  const sourcePaths = new Set(sourceFiles);

  const relevantFiles = scan.files.filter(f => {
    if (!f.content) return false;
    if (f.tier === 0) return true; // always include infra/CI files
    if (sourcePaths.has(f.path)) return true;
    // Fallback when no explicit mapping: match by subsystem name in path
    if (sourceFiles.length === 0 && f.path.toLowerCase().includes(subsystemName.toLowerCase())) return true;
    return false;
  });

  // Re-format with only relevant files; preserve the original tree so the LLM has full navigation context
  const filteredScan: ScanResult = { ...scan, files: relevantFiles };
  return [
    '## Full Project Tree (navigation context)\n',
    scan.tree,
    '\n',
    formatForLLM(filteredScan).replace(/^## Project File Tree[\s\S]*?\n\n/, ''), // strip duplicate tree
  ].join('');
}

function subsystemOutputLooksOk(files: OutputFile[], instructionPath: string): boolean {
  const norm = instructionPath.replace(/\\/g, '/');
  const base = path.posix.basename(norm);
  return files.some(f => {
    const fp = f.path.replace(/\\/g, '/');
    return fp === norm || fp.endsWith(`/${base}`) || fp === base;
  });
}

/**
 * Check if LLM-generated content contains real export names from the source.
 * If the content doesn't mention any real exports, the LLM hallucinated.
 */
/** Sanitize mermaid code blocks: strip lines with common LLM syntax errors. */
function sanitizeMermaidBlocks(content: string): string {
  return content.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_match, body: string) => {
      const lines: string[] = body.split('\n');
      const cleaned = lines.filter(line => {
        const trimmed = line.trim();
        // Reject lines with template literals (${...})
        if (/\$\{/.test(trimmed)) return false;
        // Reject double braces used incorrectly: -->{{...}} or {{"..."}}
        if (/\{\{.*\}\}/.test(trimmed) && !/\{\{.*\}\}/.test(trimmed.replace(/\w+\{\{".+?"\}\}/, ''))) {
          // Only strip truly broken double-brace patterns; keep valid Mermaid rhombus {{}}
          if (/-->\s*\{\{/.test(trimmed) || /\{\{".*"\}\}/.test(trimmed)) return false;
        }
        // Reject lines with unbalanced quotes inside node labels
        if (/\["[^"]*$/.test(trimmed) || /^[^"]*"\]/.test(trimmed)) return false;
        return true;
      });
      return '```mermaid\n' + cleaned.join('\n') + '```';
    }
  );
}

function llmContentMatchesRealExports(
  llmContent: string,
  scan: ScanResult,
  sourceFiles: string[]
): boolean {
  const realNames: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;
    const { body } = scriptOrSelfForAnalysis(sf, scanned.content);
    for (const line of body.split('\n')) {
      const m = line.match(/^export\s+(?:async\s+)?(?:function|class|const|type|interface|enum)\s+(\w+)/);
      if (m) realNames.push(m[1]);
    }
    if (/\.php$/i.test(sf)) {
      for (const line of extractPhpSymbolLines(scanned.content)) {
        const c = line.match(/(?:^|\s)(?:class|interface|trait|enum)\s+(\w+)/i);
        if (c) realNames.push(c[1]);
        const fn = line.match(/function\s+(\w+)\s*\(/i);
        if (fn) realNames.push(fn[1]);
      }
    }
  }
  if (realNames.length === 0) return true; // no exports → can't validate
  const hits = realNames.filter(name => llmContent.includes(name)).length;
  return hits / realNames.length >= 0.3; // at least 30% of real exports mentioned
}

/** Second-chance prompt when local models skip <<<EOF>>> or add prose. */
function buildSubsystemRepairMessage(today: string, instructionPath: string, planItem?: BuildPlanItem): string {
  const NON_SRC_PAT = /^(tsconfig|\.env|\.copilotignore|\.graph-context-ignore|\.context-graph-ignore|\.eslint|\.prettier|jest\.config|vitest\.config|webpack|rollup|babel|\.editorconfig|\.gitignore)/i;
  const rawApply = planItem?.applyTo ?? 'src/**';
  const applyTo = rawApply.split(',').map(s => s.trim()).filter(s => !NON_SRC_PAT.test(path.posix.basename(s))).join(',') || rawApply;
  const desc = (planItem?.description ?? 'subsystem').replace(/"/g, '\\"');
  return [
    OUTPUT_FORMAT_INSTRUCTION,
    `Reply with EXACTLY ONE file. No text before the first line or after the last line.`,
    `Line 1 MUST be exactly: <<<FILE: ${instructionPath}>>>`,
    `Last line MUST be exactly: <<<EOF>>>`,
    ``,
    `Inside the block use YAML frontmatter then markdown, e.g.:`,
    `---`,
    `description: "${desc}"`,
    `applyTo: "${applyTo}"`,
    `priority: "${planItem?.priority ?? 'P1'}"`,
    `last_updated: "${today}"`,
    `---`,
    ``,
    `## When to Read`,
    `- (3–6 short bullets)`,
    `## Graph`,
    '```mermaid',
    `graph LR; E[exports] --> D[deps]`,
    '```',
    `## Signatures`,
    `## Contracts`,
    `## Error Handling`,
    `## Danger Zone 🔴`,
    ``,
    `Keep the whole file under ~90 lines.`,
  ].join('\n');
}

function buildDeterministicSubsystemFile(
  today: string,
  instructionPath: string,
  planItem: BuildPlanItem | undefined,
  scan: ScanResult,
  sourceFiles: string[]
): OutputFile {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const desc = esc(planItem?.description ?? `Documentation for ${sourceFiles.map(f => path.posix.basename(f)).join(', ')}`);

  // ── applyTo: only real source files the instruction targets, no configs ──
  const NON_SOURCE_PATTERNS = /^(tsconfig|\.env|\.copilotignore|\.graph-context-ignore|\.context-graph-ignore|\.eslint|\.prettier|jest\.config|vitest\.config|webpack|rollup|babel|\.editorconfig|\.gitignore)/i;
  const rawApplyTo = planItem?.applyTo ?? (sourceFiles.length === 1 ? sourceFiles[0] : 'src/**');
  const cleanedApplyTo = rawApplyTo
    .split(',')
    .map(s => s.trim())
    .filter(s => !NON_SOURCE_PATTERNS.test(path.posix.basename(s)))
    .join(',');
  const applyTo = esc(cleanedApplyTo || rawApplyTo);
  const prio = planItem?.priority ?? 'P1';

  // ── Barrel / re-export detection ──
  let isBarrel = false;
  if (sourceFiles.length === 1) {
    const scanned = scan.files.find(f => f.path === sourceFiles[0]);
    if (scanned?.content) isBarrel = isBarrelFile(scanned.content);
  }

  // ── CLI command detection ──
  const cliCommands: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (scanned?.content) cliCommands.push(...extractCliCommands(scanned.content));
  }

  // When to Read — real use cases
  const useCases =
    planItem?.useCases?.filter(u => !u.includes('navigating this subsystem')).slice(0, 6) ?? [];
  if (useCases.length === 0) {
    for (const f of sourceFiles) useCases.push(`editing or refactoring \`${path.posix.basename(f)}\``);
  }

  // File purpose summaries — JSDoc first, then plan description as fallback
  const fileSummaries: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;
    const purpose = extractFilePurpose(scanned.content) ?? planItem?.description;
    const lineCount = scanned.lines;
    const exportCount = (() => {
      if (/\.php$/i.test(sf)) return extractPhpSymbolLines(scanned.content).length;
      const { body } = scriptOrSelfForAnalysis(sf, scanned.content);
      const exp = body.split('\n').filter(l => /^export\s/.test(l.trim())).length;
      if (exp > 0) return exp;
      return body.split('\n').filter(l => /^(?:export\s+)?(?:async\s+)?function\s+\w+/.test(l.trim())).length;
    })();
    const suffix = exportCount > 0 ? ` · ${exportCount} top-level symbols` : '';
    fileSummaries.push(
      purpose
        ? `- \`${sf}\` (${lineCount} lines${suffix}) — ${purpose}`
        : `- \`${sf}\` (${lineCount} lines${suffix})`
    );
  }

  // Exports with JSDoc (or barrel summary)
  let exportBlock: string;
  if (isBarrel) {
    const scanned = scan.files.find(f => f.path === sourceFiles[0]);
    const reExports = (scanned?.content ?? '').split('\n').filter(l => /^export\s/.test(l.trim()));
    exportBlock = `// Barrel file — re-exports only:\n${reExports.join('\n') || '// (empty barrel)'}`;
  } else if (cliCommands.length > 0) {
    const exportSigs = extractExports(scan, sourceFiles);
    const cmds = cliCommands.map(c => `//   ${c}`).join('\n');
    exportBlock = exportSigs
      ? `${exportSigs}\n\n// CLI commands:\n${cmds}`
      : `// CLI entry point — commands:\n${cmds}`;
  } else {
    exportBlock = extractExports(scan, sourceFiles);
  }

  // Dependencies
  const deps = extractImports(scan, sourceFiles);
  const internalDeps = deps.filter(d => !d.includes('/node_modules/') && !d.startsWith('@') && d.includes('/'));
  const externalDeps = deps.filter(d => !internalDeps.includes(d));

  // Env vars read (Node + PHP / Laravel)
  const envVars: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;
    const text = scanned.content;
    for (const m of text.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) envVars.push(`process.env.${m[1]}`);
    for (const m of text.matchAll(/process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g)) envVars.push(`process.env.${m[1]}`);
    for (const m of text.matchAll(/getenv\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) envVars.push(`getenv('${m[1]}')`);
    for (const m of text.matchAll(/(?:^|[^\w$.])env\s*\(\s*['"]([^'"]+)['"]\s*\)/gm)) envVars.push(`env('${m[1]}')`);
    for (const m of text.matchAll(/\$_ENV\s*\[\s*['"]([^'"]+)['"]\s*\]/g)) envVars.push(`$_ENV['${m[1]}']`);
  }
  const uniqueEnvVars = [...new Set(envVars)];

  // Error patterns (JS + PHP)
  const throwPatterns: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;
    const text = scanned.content;
    const throwMatches = text.matchAll(/throw\s+new\s+(\w+)\s*\(\s*['"`](.{10,80})['"`]/g);
    for (const m of throwMatches) {
      throwPatterns.push(`- \`${m[1]}\`: "${m[2]}" (\`${path.posix.basename(sf)}\`)`);
    }
    const phpThrows = text.matchAll(/throw\s+new\s+((?:\\[\w]+|[\w\\])+)\s*\(\s*['"]([^'"]{10,120})['"]\s*\)/g);
    for (const m of phpThrows) {
      throwPatterns.push(`- \`${m[1]}\`: "${m[2]}" (\`${path.posix.basename(sf)}\`)`);
    }
  }

  // Mermaid graph — real dependencies
  const mermaidNodes: string[] = [];
  const fileLabel = sourceFiles.length === 1
    ? path.posix.basename(sourceFiles[0]).replace(/\.[^.]+$/, '')
    : planItem?.area ?? 'module';
  if (internalDeps.length > 0 || externalDeps.length > 0) {
    mermaidNodes.push(`  ${fileLabel}[${fileLabel}]`);
    for (const d of internalDeps.slice(0, 8)) {
      const depName = d.split('/').pop()!;
      mermaidNodes.push(`  ${fileLabel} --> ${depName}[${depName}]`);
    }
    for (const d of externalDeps.slice(0, 5)) {
      const safeName = d.replace(/[^a-zA-Z0-9]/g, '_');
      mermaidNodes.push(`  ${fileLabel} --> ${safeName}["${d}"]`);
    }
    if (uniqueEnvVars.length > 0) {
      mermaidNodes.push(`  ${fileLabel} --> ENV{{"env vars"}}`);
    }
  }

  const hasPhp = sourceFiles.some(p => /\.php$/i.test(p));
  const sigFence = hasPhp && sourceFiles.every(p => /\.php$/i.test(p)) ? 'php' : 'typescript';

  const content = [
    '---',
    `description: "${desc}"`,
    `applyTo: "${applyTo}"`,
    `priority: "${prio}"`,
    `last_updated: "${today}"`,
    '---',
    '',
    '## When to Read',
    ...useCases.map(u => `- ${u}`),
    '',
    '## Overview',
    ...(fileSummaries.length > 0 ? fileSummaries : [`- ${sourceFiles.join(', ')}`]),
    '',
    '## Graph',
    '```mermaid',
    'graph LR',
    ...(mermaidNodes.length > 0 ? mermaidNodes : [`  ${fileLabel}[${fileLabel}]`]),
    '```',
    '',
    '## Signatures',
    '',
    `\`\`\`${sigFence}`,
    exportBlock,
    '```',
    '',
    '## Dependencies',
    ...(internalDeps.length > 0 ? ['**Internal:**', ...internalDeps.map(d => `- \`${d}\``), ''] : []),
    ...(externalDeps.length > 0 ? ['**External:**', ...externalDeps.map(d => `- \`${d}\``), ''] : []),
    ...(internalDeps.length === 0 && externalDeps.length === 0 ? ['- No dependencies detected', ''] : []),
    ...(isBarrel
      ? []
      : [
          '## Error Handling',
          ...(throwPatterns.length > 0 ? throwPatterns : ['- No explicit throws detected']),
          '',
        ]),
    '## Danger Zone 🔴',
    ...(uniqueEnvVars.length > 0
      ? uniqueEnvVars.map(v => `- Reads \`${v}\``)
      : ['- No env vars or side effects detected']),
  ].join('\n');
  return { path: instructionPath, content };
}

function buildSubsystemPassMessage(
  today: string,
  subsystemPath: string,
  rootGraphContent: string,
  scanPrompt: ScanResult,
  scanFull: ScanResult,
  sourceFiles: string[],
  planItem?: BuildPlanItem,
  passOpts?: { compact?: boolean }
): string {
  const compact = passOpts?.compact ?? false;
  const subsystemName = subsystemPath.replace(/\.instructions\.md$/, '').replace(/^.*\//, '');
  const focusedContext = buildFocusedContext(scanPrompt, sourceFiles, subsystemName);
  const actualExports = extractExports(scanFull, sourceFiles);

  const sourceList = sourceFiles.length > 0
    ? `This file covers: ${sourceFiles.map(f => `\`${f}\``).join(', ')}`
    : `This file covers the "${subsystemName}" subsystem.`;

  const applyToValue = planItem?.applyTo ?? (sourceFiles.length === 1 ? sourceFiles[0] : `src/${subsystemName}*`);
  const useCasesList = planItem?.useCases?.length
    ? planItem.useCases.map(u => `  - ${u}`).join('\n')
    : `  - working with ${subsystemName}`;

  const instruction = [
    `Run MODE: BUILD — SUBSYSTEM PASS.`,
    `Today's date: ${today}`,
    ``,
    `Generate ONLY this ONE file: ${subsystemPath}`,
    `${sourceList}`,
    ``,
    `FRONTMATTER REQUIREMENTS:`,
    `- description: "${planItem?.description ?? `${subsystemName} module documentation`}"`,
    `- applyTo: "${applyToValue}"`,
    `- priority: "${planItem?.priority ?? 'P1'}"`,
    `- last_updated: "${today}"`,
    ``,
    `⚠️  ANTI-HALLUCINATION RULES (violations = wrong instructions = broken AI context):`,
    `- ## Signatures: ONLY document symbols that appear below in "ACTUAL EXPORTS" with the export keyword.`,
    `  Do NOT document private functions, internal constants, or symbols without "export".`,
    `  Do NOT invent parameter names or types — use EXACTLY what you see in the source code.`,
    `- ## Graph: ONLY draw nodes for exported symbols. Internal helpers may appear as anonymous nodes`,
    `  if called by an export, but must NOT be labeled as exported.`,
    ``,
    `ACTUAL EXPORTS (only document these — nothing else):`,
    `\`\`\`typescript`,
    actualExports,
    `\`\`\``,
    ``,
    `MANDATORY SECTIONS (in this order, after frontmatter):`,
    ``,
    `### 1. ## When to Read  ← FIRST section, required for AI navigation`,
    `Copilot reads this section to decide if it needs to open this file.`,
    `List EXACTLY these use cases (from the build plan):`,
    useCasesList,
    ``,
    `### 2. ## Graph`,
    `  - Mermaid call graph. Root node = each exported function/class (use the ACTUAL export names above).`,
    `  - Show call edges between exports. Label edges with what triggers the call.`,
    `  - External module calls → external named nodes (e.g., "glob · npm", "fs · Node.js").`,
    `  - Side effects (file I/O, network, env reads) → {{diamond nodes}}.`,
    `  - Mark 🔴 on edges to Danger Zone dependencies.`,
    ``,
    `### 3. ## Signatures`,
    `  - EVERY exported symbol with FULL TypeScript signature (copy from ACTUAL EXPORTS above).`,
    `  - Expand each signature with: parameter descriptions, return value meaning, optional/required.`,
    `  - For exported types/interfaces: show all fields with their types.`,
    ``,
    `### 4. ## Contracts`,
    `  - Per export: preconditions (what must be true when called), postconditions (what is guaranteed after).`,
    `  - Be specific: "throws Error('context-graph system prompt not found')" not "throws on missing file".`,
    ``,
    `### 5. ## Error Handling`,
    `  - Every throw/reject with: error class, exact message string, triggering conditions.`,
    ``,
    `### 6. ## Danger Zone 🔴`,
    `  - Every external dependency, file I/O path, network endpoint, env variable.`,
    `  - Per item: what fails if unavailable, what the user sees.`,
    ``,
    `STYLE RULES:`,
    `- Dense, precise bullet points. No padding sentences.`,
    compact
      ? `- LOCAL/SMALL MODEL: keep the ENTIRE file under ~100 lines; short bullets; still use correct FILE/EOF delimiters.`
      : `- Target 80–150 lines total. If a file has many exports, document each briefly but completely.`,
    ``,
    `## Root Graph (architectural context — do not copy):`,
    `\`\`\``,
    rootGraphContent.slice(0, compact ? 900 : 2500),
    `\`\`\``,
    ``,
    `## Source Files (read every line — your primary input):`,
    `Start your response immediately with <<<FILE: ${subsystemPath}>>>.`,
  ].join('\n');

  return `${OUTPUT_FORMAT_INSTRUCTION}\n${instruction}\n\n${focusedContext}`;
}

function buildUserMessage(mode: BuildMode, scan: ScanResult, opts: BuildOptions): string {
  const projectContext = formatForLLM(scan);
  const today = new Date().toISOString().slice(0, 10);

  let modeSection = '';
  switch (mode) {
    case 'ACTUALIZE': {
      const changedList = opts.changedFiles?.join('\n') ?? '(unknown — re-scan all)';
      const existingGraph = opts.existingGraphDir ? loadExistingGraph(opts.existingGraphDir) : '';
      modeSection = [
        `Run MODE: ACTUALIZE on the following project.`,
        `Today's date: ${today}`,
        ``,
        `IMPORTANT INSTRUCTIONS:`,
        `- Do NOT output the ACTUALIZE TODO checklist.`,
        `- Do NOT output any prose outside the file blocks.`,
        `- Generate only the files that need to change as complete <<<FILE:>>> blocks.`,
        `- Use "${today}" as the updated date everywhere.`,
        ``,
        `Files changed since last build:`,
        changedList,
        existingGraph ? `\n## Existing copilot-instructions.md\n\`\`\`\n${existingGraph}\n\`\`\`` : '',
      ].join('\n');
      break;
    }
    case 'REVIEW':
      modeSection = `Run MODE: REVIEW on the following project. Report accuracy.\nToday's date: ${today}\nOutput a single <<<FILE: .context-graph-report.md>>> block with the report inside.`;
      break;
    case 'IMPACT':
      modeSection = `Run MODE: IMPACT for file: ${opts.targetFile ?? '(unknown)'}\nToday's date: ${today}\nOutput a single <<<FILE: .context-graph-report.md>>> block with the impact analysis inside.`;
      break;
    default:
      modeSection = `Run MODE: BUILD on the following project.\nToday's date: ${today}`;
  }

  return `${OUTPUT_FORMAT_INSTRUCTION}\n${modeSection}\n\n${projectContext}`;
}

// ── Subsystem file discovery ───────────────────────────────────────────────

/**
 * Parse index.md to extract the mapping: instruction file → source files.
 * Expects column format: | Instruction File | Source Files | ...
 */
function parseSubsystemMappings(generatedFiles: OutputFile[]): SubsystemMapping[] {
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
function findMissingSubsystemPaths(generatedFiles: OutputFile[]): string[] {
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

// ── Cost pricing ───────────────────────────────────────────────────────────

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'o1': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 1.10, output: 4.40 },
  'o3': { input: 10.00, output: 40.00 },
  'o3-mini': { input: 1.10, output: 4.40 },
  'claude-opus-4': { input: 15.00, output: 75.00 },
  'claude-opus-4-5': { input: 15.00, output: 75.00 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'claude-haiku-3-5': { input: 0.80, output: 4.00 },
  'claude-3-5-haiku': { input: 0.80, output: 4.00 },
};

export function estimateCost(model: string, usage: LLMUsage): number | null {
  const pricing = PRICING[model];
  if (!pricing) {
    const key = Object.keys(PRICING).find(k => model.startsWith(k));
    if (!key) return null;
    const p = PRICING[key];
    return (usage.inputTokens / 1_000_000) * p.input + (usage.outputTokens / 1_000_000) * p.output;
  }
  return (usage.inputTokens / 1_000_000) * pricing.input + (usage.outputTokens / 1_000_000) * pricing.output;
}

// ── Main API ───────────────────────────────────────────────────────────────

/** Single-pass: for ACTUALIZE / REVIEW / IMPACT */
export async function buildGraph(
  scan: ScanResult,
  config: Config,
  mode: BuildMode,
  opts: BuildOptions = {}
): Promise<GraphResult> {
  const systemPrompt = loadSystemPrompt();
  const provider = createProvider(config.provider);
  const userMessage = buildUserMessage(mode, scan, opts);

  const response = await provider.complete(systemPrompt, [{ role: 'user', content: userMessage }]);
  const files = parseOutputFiles(response.content);
  const costUSD = estimateCost(config.provider.model, response.usage);
  return { files, rawResponse: response.content, usage: response.usage, costUSD };
}

/**
 * Deterministic BUILD (no LLM): generates a complete instruction set using static analysis only.
 * Intended for low-resource environments and for users who don't want to spend tokens.
 */
export function buildGraphDeterministic(
  scan: ScanResult,
  opts: DeterministicBuildOptions = {}
): MultiPassResult {
  const today = new Date().toISOString().slice(0, 10);

  // Deterministic plan: use coverage repair to create a complete mapping.
  const plan = repairBuildPlan(scan, null, opts.repair);

  // Root files are deterministic; optionally allow a "slim root" caller preference
  // (we still emit index.md and metadata.json deterministically because they cost 0 tokens).
  const files: OutputFile[] = [];
  injectDeterministicRootFiles(today, scan, plan, files);

  // Subsystem files: deterministic skeleton derived from real exports/imports.
  for (const s of plan.subsystems) {
    const instructionPath = `.github/instructions/${s.file}`;
    files.push(
      buildDeterministicSubsystemFile(today, instructionPath, s, scan, s.sourceFiles)
    );
  }

  // Passes=1 to indicate "one deterministic run"; usage/cost are zero.
  const usage: LLMUsage = { inputTokens: 0, outputTokens: 0 };
  const passes = 1;
  return { files, usage, costUSD: 0, passes, plan };
}

function insertExportNotesUnderSignatures(md: string, notes: string): string {
  if (!notes.trim()) return md;
  const clean = notes.trim().replace(/\r\n/g, '\n');
  const section = `### Notes (LLM)\n\n${clean}\n`;
  return insertAfterHeading(md, 'Signatures', section);
}

function extractExportNamesForNotes(scan: ScanResult, sourceFiles: string[]): string[] {
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

    for (const line of body.split('\n')) {
      const m = line.match(/^export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)/);
      if (m) out.add(m[1]);
    }
  }

  return [...out].sort();
}

function buildExportNotesPrompt(config: Config, title: string, exportNames: string[], snippet: string): string {
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

/**
 * Hybrid BUILD: always generates a deterministic scaffold for the full graph,
 * then optionally enriches root + top subsystems with LLM for better prose/graphs.
 *
 * Goal: good quality with low token usage (works well with local models).
 */
export async function buildGraphHybrid(
  scan: ScanResult,
  config: Config,
  callbacks: BuildCallbacks = {},
  opts: HybridBuildOptions = {}
): Promise<MultiPassResult> {
  const { onPlanReady, onPassComplete } = callbacks;
  const systemPrompt = loadSystemPrompt();
  const provider = createProvider(config.provider);
  const today = new Date().toISOString().slice(0, 10);

  const maxSubsystems = Math.max(0, Math.min(50, opts.maxSubsystems ?? 2));
  const notesMode: 'subsystem' | 'exports' = opts.notesMode ?? 'subsystem';

  const scanFull = scan;
  const scanPrompt = config.contextDepth === 'slim' ? scanForPromptDepth(scanFull, 'slim') : scanFull;

  // Deterministic plan (no LLM planning pass)
  const plan = repairBuildPlan(scanFull, null, repairOptionsFromConfig(config));
  onPlanReady?.(plan);

  const totalExpected = 1 + 1 + plan.subsystems.length; // "plan" (synthetic) + root + subsystems
  let passes = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;

  // Synthetic pass 0 (plan)
  passes++;
  onPassComplete?.(passes, totalExpected, 'planning (deterministic)', [], 0);

  // Pass 1: deterministic root files (scaffold)
  const allFiles: OutputFile[] = [];
  injectDeterministicRootFiles(today, scanFull, plan, allFiles);
  passes++;
  onPassComplete?.(passes, totalExpected, 'root files · deterministic', allFiles.filter(f =>
    f.path === '.github/instructions/copilot-instructions.md' ||
    f.path === '.github/instructions/index.md' ||
    f.path === '.github/instructions/context-graph-path-index.md' ||
    f.path === '.github/instructions/metadata.json' ||
    f.path === '.github/instructions/graph-changelog.md' ||
    f.path === '.copilotignore' ||
    f.path === '.github/copilot-instructions.md' ||
    f.path === 'CLAUDE.md' ||
    f.path === 'AGENTS.md'
  ), 0);

  // Root notes (LLM) — snippet-based, inserted into deterministic copilot-instructions.md
  const rootIdx = allFiles.findIndex(f => f.path === '.github/instructions/copilot-instructions.md');
  if (rootIdx >= 0) {
    const rootFile = allFiles[rootIdx];
    const seedFiles = plan.subsystems.flatMap(s => s.sourceFiles).slice(0, 6);
    const snippet = buildSnippetForFiles(scanFull, seedFiles, 9000);
    const exportsBlock = plan.subsystems.slice(0, 10).map(s => `- ${s.area}: ${s.sourceFiles.join(', ')}`).join('\n');
    const prompt = buildNotesPrompt(config, 'root', plan.projectName || 'Project', exportsBlock, snippet);
    const resp = await provider.complete(systemPrompt, [{ role: 'user', content: prompt }]);
    passes++;
    totalInput += resp.usage.inputTokens;
    totalOutput += resp.usage.outputTokens;
    const cost = estimateCost(config.provider.model, resp.usage);
    if (cost !== null) totalCost += cost;
    rootFile.content = insertNotesSection(rootFile.content, resp.content, 'Architecture Overview');
    allFiles[rootIdx] = { ...rootFile, content: sanitizeMermaidBlocks(rootFile.content) };
    onPassComplete?.(passes, totalExpected, 'root notes', [allFiles[rootIdx]], cost);
  }

  // Subsystems: deterministic file + optional LLM notes for top N (default 2)
  const selected = plan.subsystems
    .slice()
    .sort((a, b) => (a.priority === b.priority ? a.file.localeCompare(b.file) : a.priority.localeCompare(b.priority)))
    .slice(0, maxSubsystems);
  const selectedSet = new Set(selected.map(s => s.file));

  for (const s of plan.subsystems) {
    const instructionPath = `.github/instructions/${s.file}`;
    let det = buildDeterministicSubsystemFile(today, instructionPath, s, scanFull, s.sourceFiles);
    passes++;
    allFiles.push(det);
    onPassComplete?.(passes, totalExpected, `${s.file} · deterministic`, [det], 0);

    if (!selectedSet.has(s.file) || maxSubsystems === 0) continue;

    const snippet = buildSnippetForFiles(scanFull, s.sourceFiles, 7000);
    const exportsBlock = extractExports(scanFull, s.sourceFiles);
    const exportNames = extractExportNamesForNotes(scanFull, s.sourceFiles);
    const prompt = notesMode === 'exports'
      ? buildExportNotesPrompt(config, s.area, exportNames, snippet)
      : buildNotesPrompt(config, 'subsystem', s.area, exportsBlock, snippet);
    const resp = await provider.complete(systemPrompt, [{ role: 'user', content: prompt }]);
    passes++;
    totalInput += resp.usage.inputTokens;
    totalOutput += resp.usage.outputTokens;
    const cost = estimateCost(config.provider.model, resp.usage);
    if (cost !== null) totalCost += cost;

    det = {
      ...det,
      content: notesMode === 'exports'
        ? insertExportNotesUnderSignatures(det.content, resp.content)
        : insertNotesSection(det.content, resp.content, 'Overview'),
    };
    det.content = sanitizeMermaidBlocks(det.content);
    allFiles[allFiles.length - 1] = det;
    onPassComplete?.(passes, totalExpected, `${s.file} · notes`, [det], cost);
  }

  return {
    files: allFiles,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
    costUSD: totalCost > 0 ? totalCost : 0,
    passes,
    plan,
  };
}

/** Multi-pass: for BUILD — Pass 0 (planning) → Pass 1 (root files) → Pass 2...N (subsystem files) */
export async function buildGraphMultiPass(
  scan: ScanResult,
  config: Config,
  callbacks: BuildCallbacks = {}
): Promise<MultiPassResult> {
  const { onPlanReady, onPassComplete } = callbacks;
  const systemPrompt = loadSystemPrompt();
  const provider = createProvider(config.provider);
  const today = new Date().toISOString().slice(0, 10);

  const allFiles: OutputFile[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let passes = 0;

  const scanFull = scan;
  const scanPrompt = config.contextDepth === 'slim' ? scanForPromptDepth(scanFull, 'slim') : scanFull;

  // ── Pass 0: planning ───────────────────────────────────────────────────
  const planMsg = buildPlanningPassMessage(scanFull);
  const planResp = await provider.complete(systemPrompt, [{ role: 'user', content: planMsg }]);
  passes++;
  totalInput += planResp.usage.inputTokens;
  totalOutput += planResp.usage.outputTokens;
  const costPlan = estimateCost(config.provider.model, planResp.usage);
  if (costPlan !== null) totalCost += costPlan;

  const plan = repairBuildPlan(scanFull, parseBuildPlan(planResp.content), repairOptionsFromConfig(config));
  onPlanReady?.(plan);

  // Total expected passes: plan(0) + root(1) + one per subsystem (after coverage repair)
  const subsystemCount = plan.subsystems.length;
  const totalExpected = 1 + 1 + subsystemCount; // plan + root + subsystems

  onPassComplete?.(passes, totalExpected, 'planning', [], costPlan);

  // ── Pass 1: root files ─────────────────────────────────────────────────
  const pass1Msg = buildRootPassMessage(today, scanPrompt, plan, scanFull, {
    slimRoot: config.contextDepth === 'slim',
  });
  const pass1 = await provider.complete(systemPrompt, [{ role: 'user', content: pass1Msg }]);
  passes++;
  totalInput += pass1.usage.inputTokens;
  totalOutput += pass1.usage.outputTokens;
  const cost1 = estimateCost(config.provider.model, pass1.usage);
  if (cost1 !== null) totalCost += cost1;

  const pass1Files = parseOutputFiles(pass1.content);
  const llmCopilot = pass1Files.find(f => f.path.endsWith('copilot-instructions.md'))?.content;
  injectDeterministicRootFiles(today, scanFull, plan, pass1Files, llmCopilot);
  allFiles.push(...pass1Files);
  onPassComplete?.(passes, totalExpected, 'root files', pass1Files, cost1);

  // ── Determine subsystem passes ─────────────────────────────────────────
  const rootGraphContent = pass1Files.find(f => f.path.endsWith('copilot-instructions.md'))?.content ?? '';

  let pendingSubsystems: Array<{ instructionPath: string; sourceFiles: string[]; planItem?: BuildPlanItem }>;

  if (plan.subsystems.length > 0) {
    pendingSubsystems = plan.subsystems
      .filter(s => !pass1Files.some(f => f.path.endsWith(s.file)))
      .map(s => ({
        instructionPath: `.github/instructions/${s.file}`,
        sourceFiles: s.sourceFiles,
        planItem: s,
      }));
  } else {
    // Fallback: parse from index.md
    const subsystemMappings = parseSubsystemMappings(pass1Files);
    if (subsystemMappings.length > 0) {
      pendingSubsystems = subsystemMappings
        .filter(m => !pass1Files.some(f => f.path === m.instructionPath))
        .map(m => ({ instructionPath: m.instructionPath, sourceFiles: m.sourceFiles }));
    } else {
      pendingSubsystems = findMissingSubsystemPaths(pass1Files).map(p => ({ instructionPath: p, sourceFiles: [] }));
    }
  }

  // ── Pass 2...N: one subsystem file per pass ────────────────────────────
  const compactSubsystem = config.provider.provider === 'ollama' || config.contextDepth === 'slim';

  for (const sub of pendingSubsystems) {
    const { instructionPath, sourceFiles, planItem } = sub;
    const label = instructionPath.replace('.github/instructions/', '');

    const passMsg = buildSubsystemPassMessage(
      today,
      instructionPath,
      rootGraphContent,
      scanPrompt,
      scanFull,
      sourceFiles,
      planItem,
      { compact: compactSubsystem }
    );
    const passResp = await provider.complete(systemPrompt, [{ role: 'user', content: passMsg }]);
    passes++;
    totalInput += passResp.usage.inputTokens;
    totalOutput += passResp.usage.outputTokens;
    let lastCost = estimateCost(config.provider.model, passResp.usage);
    if (lastCost !== null) totalCost += lastCost;

    let passFiles = parseOutputFiles(passResp.content);
    let statusLabel = label;

    if (!subsystemOutputLooksOk(passFiles, instructionPath)) {
      const repairMsg = buildSubsystemRepairMessage(today, instructionPath, planItem);
      const repairResp = await provider.complete(systemPrompt, [{ role: 'user', content: repairMsg }]);
      passes++;
      totalInput += repairResp.usage.inputTokens;
      totalOutput += repairResp.usage.outputTokens;
      const costR = estimateCost(config.provider.model, repairResp.usage);
      if (costR !== null) totalCost += costR;
      passFiles = parseOutputFiles(repairResp.content);
      lastCost = costR;
    }

    // Sanitize mermaid blocks in all parsed LLM files
    for (const pf of passFiles) {
      pf.content = sanitizeMermaidBlocks(pf.content);
    }

    // Fallback to deterministic if parsing failed OR LLM hallucinated content
    const parsedFile = passFiles.find(f =>
      f.path.replace(/\\/g, '/').endsWith(path.posix.basename(instructionPath))
    );
    const hallucinated = parsedFile && sourceFiles.length > 0
      && !llmContentMatchesRealExports(parsedFile.content, scanFull, sourceFiles);

    if (!subsystemOutputLooksOk(passFiles, instructionPath) || hallucinated) {
      passFiles = [
        buildDeterministicSubsystemFile(
          today,
          instructionPath,
          planItem,
          scanFull,
          sourceFiles
        ),
      ];
      lastCost = null;
      statusLabel = hallucinated ? `${label} · deterministic (hallucination rejected)` : `${label} · deterministic`;
    }

    allFiles.push(...passFiles);
    onPassComplete?.(passes, totalExpected, statusLabel, passFiles, lastCost);
  }

  return {
    files: allFiles,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
    costUSD: totalCost > 0 ? totalCost : null,
    passes,
    plan,
  };
}
