---
description: "Mirror — `.cursor/rules/` (3 files, part 16/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-bundle-p5.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p6.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p7.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p5.mdc` (174 lines · 56 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p6.mdc` (138 lines · 54 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p7.mdc` (77 lines · 13 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p5.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p20.mdc ──
// ── .cursor/rules/ctxgraph--src-project-graph.mdc ──
// ── src/project-graph.ts ──
/** True when a prior context-graph build left core files under `.github/instructions/`. */
export function projectGraphExists(projectRoot: string): boolean { return GRAPH_MARKER_PATHS.some(rel => fs.existsSync(path.join(projectRoot, rel))); }
// ── .cursor/rules/ctxgraph--src-project-root.mdc ──
// ── src/project-root.ts ──
/**
 * Git work tree root, or null if `cwd` is not inside a Git repository.
 */
export function tryGitRepositoryRoot(cwd: string): string | null { try { const out = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], }).trim(); if (!out) return null; re…
 * Resolves where `.github/instructions/` and `.context-graph.json` live.
 *
 * - **Implicit cwd** (no CLI `[dir]`, or `dir` is `.` / same as `process.cwd()`):
 *   1. `CONTEXT_GRAPH_ROOT` if set and points to an existing directory
 *   2. else Git repository root from cwd (`git rev-parse --show-toplevel`)
 *   3. else `path.resolve(cwd)`
 * - **Explicit `[dir]`** (subfolder path): that path only — no Git uplift (monorepo package roots).
 */
export function resolveProjectRoot(cliDirArg: string | undefined, cwd: string = process.cwd()): string { /* ~26 lines */ }
export type MistakenBuildModeFlag = 'hybrid' | 'deterministic' | 'llm';
export interface BuildDirNormalization { projectDir: string | undefined; mistakenModeFlag?: MistakenBuildModeFlag; }
/**
 * If `[dir]` is actually a build-mode token (`hybrid`, `no-llm`, …), treat as implicit repo root.
 */
export function normalizeBuildDirArg(cliDirArg: string | undefined): BuildDirNormalization { if (!cliDirArg) return { projectDir: undefined }; const key = cliDirArg.toLowerCase().replace(/_/g, '-'); if (!BUILD_MODE_DIR_ALIASES.has(key)) …
export function suggestedBuildFlagForMistake(flag: MistakenBuildModeFlag): string { if (flag === 'deterministic') return '--no-llm'; return `--${flag}`; }
/** Exit-friendly check before writing `.context-graph.json` / instructions. */
export function assertProjectRootExists(projectRoot: string): void { let st: fs.Stats; try { st = fs.statSync(projectRoot); } catch { throw new Error( `Project directory does not exist: ${projectRoot}\n` + `Pass a real path: context-grap…
// ── .cursor/rules/ctxgraph--src-providers-anthropic.mdc ──
// ── src/providers/anthropic.ts ──
export class AnthropicProvider implements LLMProvider { /* ~34 lines */ }
// ── .cursor/rules/ctxgraph--src-providers-index.mdc ──
// ── src/providers/index.ts ──
export function createProvider(config: ProviderConfig): LLMProvider { switch (config.provider) { case 'openai': case 'openai-compat': case 'ollama': return new OpenAIProvider(config); case 'anthropic': return new AnthropicProvider(config…
export type { LLMProvider, LLMMessage, LLMUsage, LLMResponse, ProviderConfig } from './types'
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p21.mdc ──
// ── .cursor/rules/ctxgraph--src-providers-openai.mdc ──
// ── src/providers/openai.ts ──
export class OpenAIProvider implements LLMProvider { /* ~44 lines */ }
// ── .cursor/rules/ctxgraph--src-providers-types.mdc ──
// ── src/providers/types.ts ──
export interface LLMMessage { role: 'user' | 'assistant'; content: string; }
export interface LLMUsage { inputTokens: number; outputTokens: number; }
export interface LLMResponse { content: string; usage: LLMUsage; }
export interface LLMProvider { complete(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse>; }
export interface ProviderConfig { provider: 'openai' | 'anthropic' | 'openai-compat' | 'ollama'; model: string; apiKeyEnv: string; baseUrl?: string; maxTokens?: number; }
// ── .cursor/rules/ctxgraph--src-scanner.mdc ──
// ── src/scanner.ts ──
/** Root files with gitignore-style rules, scanned after `.gitignore` / `.copilotignore`. */
export const GRAPH_CONTEXT_IGNORE_FILENAMES = ['.graph-context-ignore', '.context-graph-ignore'] as const;
export interface ScannedFile { path: string; tier: 0 | 1 | 2 | 3; content: string; lines: number; truncated: boolean; }
export interface ScanResult { tree: string; files: ScannedFile[]; tokenEstimate: number; fileCount: number; skippedCount: number; }
export function classifyFile(relPath: string): 0 | 1 | 2 | 3 { const normalized = relPath.replace(/\\/g, '/'); const parts = normalized.split('/'); const name = parts[parts.length - 1]; if (parts.some(p => TIER3_DIRS.has(p))) return 3; i…
export async function scanProject( projectRoot: string, maxFiles = 200, maxInputTokens = 80000, options?: { /* ~126 lines */ }
export function formatForLLM(scan: ScanResult): string { /* prompt template (~52 lines) */ }
/**
 * Returns a shallow copy of the scan with long file bodies truncated for LLM prompts.
 * Tier 0–2 only; Tier 3 unchanged. Does not replace full scan for `repairBuildPlan` / `buildMetadataJson`.
 */
export function scanForPromptDepth(scan: ScanResult, depth: 'full' | 'slim'): ScanResult { /* ~20 lines */ }
// ── .cursor/rules/ctxgraph--src-source-extract-csharp.mdc ──
// ── src/source-extract/csharp.ts ──
/** C# symbol and import extraction. */
export function extractCSharpSymbolLines(cs: string): string[] { /* ~25 lines */ }
/** `using Foo.Bar;`, `global using`, `using static`. */
export function extractCSharpImports(cs: string): string[] { const out: string[] = []; for (const rawLine of cs.replace(/\r\n/g, '\n').split('\n')) { const t = rawLine.trim(); if (!t || t.startsWith('//')) continue; const m = t.match(/^(…
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p22.mdc ──
// ── .cursor/rules/ctxgraph--src-source-extract-go.mdc ──
// ── src/source-extract/go.ts ──
/** `import "path"`, `import alias "path"`, and `import ( ... )`. */
export function extractGoImports(go: string): string[] { /* ~43 lines */ }
export function extractGoSymbolLines(go: string): string[] { /* ~23 lines */ }
// ── .cursor/rules/ctxgraph--src-source-extract-index.mdc ──
// ── src/source-extract/index.ts ──
/**
 * Shared helpers for Vue / PHP / Python / Go — scanner + deterministic graph.
 * @module source-extract
 */
export { isMessageOrPromptPath, isExecutableModulePath, isComposableLikePath } from './paths'
export { isPromptTemplateBody, compactTsExportLine } from './ts-prompt'
export { extractScriptSkeleton } from './ts-skeleton'
export { instructionSplitScore, INSTRUCTION_OWN_FILE_SCORE_THRESHOLD, } from './instruction-score'
export { extractVueScriptCombined, scriptOrSelfForAnalysis, extractVuePropKeys, extractVueSymbolLines, extractVueTemplateBrief, buildVueRoutingSignatures, extractVueComputedBranches, } from './vue-sfc'
export { extractNuxtRuntimeBullets, extractDeterministicErrors, extractSideEffectBullets, } from './nuxt-runtime'
export { extractPhpSymbolLines, extractPhpMethodParamNames, extractPhpJsonResponseKeys, buildPhpRoutingSignatures, buildPhpOneLineSummary, extractPhpUseStatements, } from './php'
export { extractPythonSymbolLines, extractPythonImports } from './python'
export { extractGoImports, extractGoSymbolLines } from './go'
export { extractCSharpSymbolLines, extractCSharpImports } from './csharp'
export { extractRustImports, extractRustSymbolLines } from './rust'
export { extractJavaKotlinImports, extractJavaKotlinSymbolLines } from './java-kotlin'
export { extractRubyImports, extractRubySymbolLines } from './ruby'
// ── .cursor/rules/ctxgraph--src-source-extract-instruction-score.mdc ──
// ── src/source-extract/instruction-score.ts ──
/** Score for auto split: one instruction file per “heavy” module (no LLM). */
export function instructionSplitScore(relPath: string, content: string, lines?: number): number { /* ~39 lines */ }
export const INSTRUCTION_OWN_FILE_SCORE_THRESHOLD = 42;
// ── .cursor/rules/ctxgraph--src-source-extract-java-kotlin.mdc ──
// ── src/source-extract/java-kotlin.ts ──
/** Java / Kotlin symbol and import extraction. */
export function extractJavaKotlinImports(src: string): string[] { const out: string[] = []; for (const rawLine of src.replace(/\r\n/g, '\n').split('\n')) { const t = rawLine.trim(); if (!t || t.startsWith('//') || t.startsWith('/*')) con…
export function extractJavaKotlinSymbolLines(src: string): string[] { /* ~29 lines */ }
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p23.mdc ──
// ── .cursor/rules/ctxgraph--src-source-extract-nuxt-runtime.mdc ──
// ── src/source-extract/nuxt-runtime.ts ──
/** Nuxt / Vue script runtime hints (no LLM). */
export function extractNuxtRuntimeBullets(script: string): string[] { /* prompt template (~34 lines) */ }
/** Errors / HTTP failures without LLM (Nuxt createError + classic throws). */
export function extractDeterministicErrors(script: string, fileLabel?: string): string[] { /* prompt template (~30 lines) */ }
/** Side effects for Danger Zone (browser, stores, network, events). */
export function extractSideEffectBullets(script: string): string[] { /* prompt template (~48 lines) */ }
// ── .cursor/rules/ctxgraph--src-source-extract-paths.mdc ──
// ── src/source-extract/paths.ts ──
/** Prompt/message modules: prefer bundle + compact instructions (deterministic routing). */
export function isMessageOrPromptPath(relPath: string): boolean { const norm = relPath.replace(/\\/g, '/'); return ( /(?:^|\/)(?:messages|prompts?)\//i.test(norm) || /graph-create-agent/i.test(norm) || /\/(?:prompt|messages)\./i.test(nor…
/** CLI / command registration — collapse as executable, not LLM prompt template. */
export function isExecutableModulePath(relPath: string): boolean { const norm = relPath.replace(/\\/g, '/'); return ( /(?:^|\/)cli(?:\/|\.)/i.test(norm) || /(?:^|\/)commands?\//i.test(norm) || /(?:^|\/)hooks\.ts$/i.test(norm) ); }
/** `dev/composables/foo.ts`, `src/composables/bar.js`, etc. */
export function isComposableLikePath(relPath: string): boolean { return /(?:^|\/)composables\/[^/]+\.(?:[mc]?[jt]sx?|jsx?)$/i.test(relPath.replace(/\\/g, '/')); }
// ── .cursor/rules/ctxgraph--src-source-extract-php.mdc ──
// ── src/source-extract/php.ts ──
/** PHP routing and symbol extraction. */
export function extractPhpSymbolLines(php: string): string[] { /* ~30 lines */ }
/** Balanced `(...)` after `function name` — supports multiline Laravel DI lists. */
export function extractPhpMethodParamNames(php: string, methodName: string): string[] { /* ~29 lines */ }
/** JSON / array keys from `return response()->json([...])` (routing hint, not full payload). */
export function extractPhpJsonResponseKeys(php: string): string[] { /* ~29 lines */ }
/**
 * Compact routing block for `.php` in deterministic instructions.
 * No full file — class, DI method summary, response keys, import count.
 */
export function buildPhpRoutingSignatures(relPath: string, php: string): string[] { /* prompt template (~63 lines) */ }
/** One-line index row for capped PHP folder bundles. */
export function buildPhpOneLineSummary(relPath: string, php: string): string { /* ~16 lines */ }

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p6.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p19.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-llm-notes.mdc ──
// ── src/graph-builder/llm/notes.ts ──
export function insertNotesSection(md: string, notes: string, afterHeading: string): string { /* ~14 lines */ }
export function buildNotesPrompt( config: Config, kind: 'root' | 'subsystem', title: string, exportsBlock: string, snippet: string ): string { /* prompt template (~32 lines) */ }
export function buildSnippetForFiles(scan: ScanResult, sourceFiles: string[], maxChars: number): string { /* prompt template (~101 lines) */ }
export function insertExportNotesUnderSignatures(md: string, notes: string): string { if (!notes.trim()) return md; const clean = notes.trim().replace(/\r\n/g, '\n'); const section = `### Notes (LLM)\n\n${clean}\n`; return insertAfterHea…
export function extractExportNamesForNotes(scan: ScanResult, sourceFiles: string[]): string[] { /* ~114 lines */ }
export function buildExportNotesPrompt(config: Config, title: string, exportNames: string[], snippet: string): string { /* prompt template (~23 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-llm-validate.mdc ──
// ── src/graph-builder/llm/validate.ts ──
export function mergeLlmProse(skeleton: string, llmContent: string): string { /* ~26 lines */ }
export function insertAfterHeading(md: string, heading: string, insert: string): string { const re = new RegExp(`^## ${heading}\\b[^\\n]*\\n`, 'm'); const m = re.exec(md); if (!m) return md + '\n\n' + insert; const insertAt = m.index + m…
export function subsystemOutputLooksOk(files: OutputFile[], instructionPath: string): boolean { const norm = instructionPath.replace(/\\/g, '/'); const base = path.posix.basename(norm); return files.some(f => { const fp = f.path.replace(…
/** Sanitize mermaid code blocks: strip lines with common LLM syntax errors. */
export function sanitizeMermaidBlocks(content: string): string { /* ~22 lines */ }
export function llmContentMatchesRealExports( llmContent: string, scan: ScanResult, sourceFiles: string[] ): boolean { /* ~77 lines */ }
/** Second-chance prompt when local models skip <<<EOF>>> or add prose. */
export function buildSubsystemRepairMessage(today: string, instructionPath: string, planItem?: BuildPlanItem): string { /* prompt template (~33 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-messages-planning.mdc ──
// ── src/graph-builder/messages/planning.ts ──
export function buildPlanningPassMessage(scan: ScanResult): string { /* prompt template (~65 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-messages-root.mdc ──
// ── src/graph-builder/messages/root.ts ──
export function buildRootPassMessage( today: string, scanPrompt: ScanResult, plan: BuildPlan | undefined, scanFull: ScanResult, opts?: { /* prompt template (~116 lines) */ }
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p2.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p13.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-root-slim.mdc ──
// ── src/graph-builder/deterministic/root-slim.ts ──
export interface CopilotRootOptions { /** Force slim root (e.g. `contextDepth: slim`). Auto when subsystems ≥ threshold. */ slimRoot?: boolean; }
export function resolveRootSlimMode(plan: BuildPlan, opts?: CopilotRootOptions): boolean { if (opts?.slimRoot === true) return true; if (opts?.slimRoot === false) return false; if (plan.subsystems.length >= ROOT_SLIM_AUTO_SUBSYSTEM_THRES…
/** Directory key for grouping (up to 3 segments under repo root). */
export function sourceDirGroupKey(sourcePath: string): string { const norm = sourcePath.replace(/\\/g, '/'); if (!norm.includes('/')) return '.'; const parts = path.posix.dirname(norm).split('/').filter(Boolean); const depth = parts[0] =…
export interface DirGroupSummary { dir: string; subsystemCount: number; sourceFileCount: number; bestPriority: BuildPlanItem['priority']; }
export function summarizeSubsystemDirGroups(plan: BuildPlan): DirGroupSummary[] { /* ~26 lines */ }
export function buildQuickNavigationLines( plan: BuildPlan, slim: boolean, scan?: ScanResult ): string[] { /* prompt template (~92 lines) */ }
export function buildSlimArchitectureOverviewLines(plan: BuildPlan): string[] { /* prompt template (~24 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-root.mdc ──
// ── src/graph-builder/deterministic/root.ts ──
export type { CopilotRootOptions }
export function buildDeterministicCopilotInstructions( today: string, scan: ScanResult, plan: BuildPlan, rootOpts?: CopilotRootOptions ): string { /* prompt template (~142 lines) */ }
export function buildDeterministicChangelog(today: string, plan: BuildPlan): string { const lines = [ `# Context Graph — Changelog`, ``, `## ${today} — Initial Build`, ``, `Subsystems created:`, ...plan.subsystems.map(s => `- \`${s.file}…
/** Standard scan-exclusion hints — never infer top-level dirs from nested lockfiles. */
export function buildDeterministicCopilotIgnore(_scan?: ScanResult): string { return [ '# Managed by context-graph — scan exclusions (gitignore syntax; ** = any depth)', '# For project-specific paths use .graph-context-ignore (does not o…
export function injectDeterministicRootFiles( today: string, scan: ScanResult, plan: BuildPlan, files: OutputFile[], llmCopilotContent?: string, rootOpts?: CopilotRootOptions, instructionTargets: I… { /* prompt template (~190 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-routing-mandate.mdc ──
// ── src/graph-builder/deterministic/routing-mandate.ts ──
/** Imperative routing copy (MUST / BLOCKING) — no "when", "should", "prefer". */
export const ROUTING_MANDATE_HEADING = '## MANDATORY — read instructions first (BLOCKING)';
/** When user names a component/file in chat (LinkTag, useSeo) — no file open. */
export function buildNamedEntityRoutingMandate(): string[] { /* prompt template (~16 lines) */ }
/** Shared 5-step BLOCKING workflow. */
export function buildRoutingWorkflowSteps(examplePath?: string): string[] { /* prompt template (~18 lines) */ }
/** After "## How to use this graph" in copilot-instructions.md */
export function buildCopilotGraphMandate(examplePath: string): string[] { return [ ROUTING_MANDATE_HEADING, ``, ...buildNamedEntityRoutingMandate(), ...buildRoutingWorkflowSteps(examplePath), `**GitHub Copilot (VS Code / JetBrains / Copi…
/** Top of CLAUDE.md / AGENTS.md / GEMINI.md — immediately after title. */
export function buildAgentEntryMandate(): string[] { return [ ROUTING_MANDATE_HEADING, ``, ...buildNamedEntityRoutingMandate(), ...buildRoutingWorkflowSteps(), ]; }
export type AgentEntryTool = | 'claude' | 'agents' | 'gemini' | 'codex' | 'windsurf' | 'cline' | 'copilot';
/** Tool-specific lines after shared mandate (docs-backed, May 2026). */
export function buildToolSpecificRoutingLines(tool: AgentEntryTool): string[] { /* prompt template (~71 lines) */ }
export function buildAgentEntryWithTool(title: string, tool: AgentEntryTool): string[] { return [ `# ${title}`, ``, ...buildAgentEntryMandate(), ...buildToolSpecificRoutingLines(tool), ]; }
/** Cursor always-on router rule body (no frontmatter). */
export function buildCursorRouterMandate(): string[] { return [ `## MANDATORY routing (BLOCKING)`, ``, `**MUST** follow attached \`ctxgraph--*\` rule when \`globs\` match the file you edit.`, `If none attached: **MUST** complete path-ind…
/** Windsurf: always_on trigger (docs.windsurf.com — rules in .windsurf/rules/). */
export function buildWindsurfContextGraphRule(): string { const body = [ `# context-graph — Windsurf routing (always on)`, ``, ...buildNamedEntityRoutingMandate(), ...buildRoutingWorkflowSteps(), ...buildToolSpecificRoutingLines('windsur…
/** Cline workspace rule (no standard always-on frontmatter). */
export function buildClineContextGraphRule(): string { return [ `# context-graph — Cline routing`, ``, ...buildRoutingWorkflowSteps(), ...buildToolSpecificRoutingLines('cline'), `## Also load`, ``, `- \`.github/instructions/copilot-instr…
/** Codex supplemental doc (AGENTS.md is primary). */
export function buildCodexContextGraphRule(): string { return [ `# context-graph — Codex supplement`, ``, `**MUST** read \`AGENTS.md\` at repo root first — Codex loads it before every run.`, ``, ...buildRoutingWorkflowSteps(), ...buildTo…
/** Compact matrix for copilot-instructions / human reference. */
export function buildAiToolRoutingReferenceSection(): string[] { /* prompt template (~22 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-subsystem.mdc ──
// ── src/graph-builder/deterministic/subsystem.ts ──
export function buildDeterministicSubsystemFile( today: string, instructionPath: string, planItem: BuildPlanItem | undefined, scan: ScanResult, sourceFiles: string[] ): OutputFile { /* prompt template (~300 lines) */ }
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p14.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-discovery.mdc ──
// ── src/graph-builder/discovery.ts ──
export function parseSubsystemMappings(generatedFiles: OutputFile[]): SubsystemMapping[] { /* ~28 lines */ }
/** Fallback: extract subsystem paths from markdown links (old format) */
export function findMissingSubsystemPaths(generatedFiles: OutputFile[]): string[] { /* ~16 lines */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-extract-deps-graph.mdc ──
// ── src/graph-builder/extract/deps-graph.ts ──
export const TS_JS_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.go', '.py'];
export function isTsJsLikePath(p: string): boolean { return /\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i.test(p); }
export function stripKnownExt(p: string): string { return p.replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue|go|py)$/i, ''); }
export function extractImportSpecifiersFromTsAst(filePath: string, content: string): string[] { /* ~29 lines */ }
export function resolveInternalImport( fromFile: string, spec: string, existingPaths: Set<string> ): string | null { /* ~30 lines */ }
export function buildDeterministicDependencyGraph( scan: ScanResult, opts?: { /* prompt template (~129 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-extract-exports.mdc ──
// ── src/graph-builder/extract/exports.ts ──
/** JSDoc attached to a declaration (leading trivia via TS API). */
export function formatAttachedJSDocBlocks(sf: ts.SourceFile, node: ts.Node): string[] { /* ~16 lines */ }
/**
 * Extract exports with surrounding context: JSDoc comments above the export,
 * and the first meaningful line of the body (to hint at return type / purpose).
 */
export function extractExports(scan: ScanResult, sourceFiles: string[]): string { /* prompt template (~242 lines) */ }
export const DETERMINISTIC_SOURCE_MAX_LINES = 80;
export const DETERMINISTIC_SOURCE_SKELETON_MAX_LINES = 48;
/** Full ## Source only when signatures are thin or UI/runtime needs script body. */
export function shouldIncludeDeterministicSource( scan: ScanResult, sourceFiles: string[], exportBlock: string ): boolean { /* ~21 lines */ }
export function buildDeterministicSourceSection(scan: ScanResult, sourceFiles: str

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p7.mdc ──
/**
 * Curated index of agency-agents (https://github.com/msitarzewski/agency-agents).
 *
 * Each entry describes:
 *   - where the .md file lives in the upstream repo
 *   - what project signals trigger a match
 *   - a short description for the generated README
 */
export interface AgentEntry { /* ~16 lines */ }
export interface AgentMatchRule { /** File extensions present in the project (e.g. ['.ts', '.tsx']) */ extensions?: string[]; /** File/dir names that indicate relevance (e.g. ['Dockerfile', 'docker-compose']) */ filePatterns?: RegExp[]; …
export const AGENTS_CATALOG: AgentEntry[] = [ // ── Engineering ─────────────────────────────────────────────────────────── { /* prompt template (~295 lines) */ }
/** Maximum agents to recommend by default */
export const MAX_RECOMMENDED_AGENTS = 10;
// ── .cursor/rules/ctxgraph--src-agents.mdc ──
// ── src/agents.ts ──
/**
 * Rank all catalog agents against the scanned project and return the top N.
 */
export function matchAgents( scan: ScanResult, plan?: BuildPlan, maxAgents = MAX_RECOMMENDED_AGENTS, ): AgentEntry[] { const ctx = buildMatchContext(scan, plan); const scored = AGENTS_CATALOG .map(entry => ({ entry, score: scoreAgent(ent…
export interface FetchedAgent { slug: string; name: string; description: string; usage: string; category: string; content: string; }
/**
 * Download agent .md files from the upstream repo.
 * Failures are logged but don't break the build.
 */
export async function fetchAgents( entries: AgentEntry[], onProgress?: (done: number, total: number, name: string) => void, ): Promise<FetchedAgent[]> { /* ~30 lines */ }
export interface AgentsWriteResult { created: string[]; updated: string[]; readmePath: string; }
/**
 * Write fetched agents to .github/agents/ and generate a README.
 */
export function writeAgents( agents: FetchedAgent[], projectRoot: string, ): AgentsWriteResult { /* ~27 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-agents-install.mdc ──
// ── src/cli/agents-install.ts ──
export async function installRecommendedAgents( scan: ScanResult, plan: BuildPlan | null | undefined, projectRoot: string, opts: { /* ~33 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-build-run.mdc ──
// ── src/cli/build-run.ts ──
export function resolveBuildStrategy( config: Config, opts: { /* ~22 lines */ }
export interface RunGraphBuildOpts { strategy: BuildStrategy; effectiveHybridMax: number; quiet: boolean; jsonOutput: boolean; getSpinner: () => Ora | null; setSpinner: (spinner: Ora | null) => void; }
export async function runGraphBuild( scan: ScanResult, config: Config, opts: RunGraphBuildOpts ): Promise<MultiPassResult> { /* ~84 lines */ }

```

## Dependencies
**External:**
- ``

## Error Handling
- `Error`: "Project directory does not exist: ${projectRoot}\n` + " (`ctxgraph--cursor-rules-bundle-p5.mdc`)

## Danger Zone 🔴
- **[fs]** filesystem I/O
