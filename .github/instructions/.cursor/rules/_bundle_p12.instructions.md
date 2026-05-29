---
description: "Mirror — `.cursor/rules/` (4 files, part 12/39)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-bundle-p30.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p4.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p5.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p6.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p30.mdc` (38 lines · 2 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p4.mdc` (94 lines · 17 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p5.mdc` (174 lines · 56 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p6.mdc` (110 lines · 22 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
  Rules --> package["package"]
  Rules --> ENV{{"env / config"}}
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p30.mdc ──
// ── .cursor/rules/ctxgraph--test-bundle.mdc ──
// ── test/extract.test.mjs ──
/** Targets barrels only — not file purpose. */
export function extractReExportTargets() {}`;
 * Framework-aware deterministic extraction (no LLM).
 */
export function foo() {}`;

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p4.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p20.mdc ──
// ── .cursor/rules/ctxgraph--test-bundle.mdc ──
// ── test/extract.test.mjs ──
/** Targets barrels only — not file purpose. */
export function extractReExportTargets() {}`;
 * Framework-aware deterministic extraction (no LLM).
 */
export function foo() {}`;
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p3.mdc ──
// ── .cursor/rules/ctxgraph--src-cli-commands-actualize.mdc ──
// ── src/cli/commands/actualize.ts ──
export function registerActualizeCommand(program: Command): void { /* ~102 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-agents.mdc ──
// ── src/cli/commands/agents.ts ──
export function registerAgentsCommand(program: Command): void { /* ~77 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-build.mdc ──
// ── src/cli/commands/build.ts ──
export function registerBuildCommand(program: Command): void { /* ~279 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-hook-check.mdc ──
// ── src/cli/commands/hook-check.ts ──
export function registerHookCheckCommand(program: Command): void { /* ~69 lines */ }
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p4.mdc ──
// ── .cursor/rules/ctxgraph--src-cli-commands-impact.mdc ──
// ── src/cli/commands/impact.ts ──
export function registerImpactCommand(program: Command): void { /* ~33 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-resolve.mdc ──
// ── src/cli/commands/resolve.ts ──
export function registerResolveCommand(program: Command): void { /* ~38 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-review.mdc ──
// ── src/cli/commands/review.ts ──
export function registerReviewCommand(program: Command): void { /* ~41 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-validate.mdc ──
// ── src/cli/commands/validate.ts ──
export function registerValidateCommand(program: Command): void { /* ~43 lines */ }
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p5.mdc ──
// ── .cursor/rules/ctxgraph--src-cli-io.mdc ──
// ── src/cli/io.ts ──
export interface CliOutputOpts { quiet?: boolean; json?: boolean; }
export function createLoggers(opts: CliOutputOpts) { const quiet = opts.quiet ?? false; const jsonOutput = opts.json ?? false; const log = (...args: unknown[]) => { if (!quiet && !jsonOutput) console.log(...args); }; return { quiet, json…
export function logResolvedProjectRoot( log: (...args: unknown[]) => void, projectRoot: string, opts: CliOutputOpts ) { if (opts.quiet || opts.json) return; const cw = path.resolve(process.cwd()); const pr = path.resolve(projectRoot); if…
export function formatCost(costUSD: number | null, inputTokens: number, outputTokens: number): string { const tokenStr = `${Math.round(inputTokens / 1000)}k in / ${Math.round(outputTokens / 1000)}k out`; if (costUSD === null) return chal…
/** Pre-push hook only: avoid enquirer (Node 20+ can throw ERR_USE_AFTER_CLOSE on confirm). */
export async function promptHookRunActualize(): Promise<boolean> { /* ~24 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-program.mdc ──
// ── src/cli/program.ts ──
export const program = new Command();
// ── .cursor/rules/ctxgraph--src-cli-version.mdc ──
// ── src/cli/version.ts ──
export const PKG_VERSION: string = (require('../../package.json') as { version: string }).version;

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
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p24.mdc ──
// ── .cursor/rules/ctxgraph--src-source-extract-ruby.mdc ──
// ── src/source-extract/ruby.ts ──
/** Ruby symbol and require extraction. */
export function extractRubyImports(rb: string): string[] { const out: string[] = []; for (const rawLine of rb.replace(/\r\n/g, '\n').split('\n')) { const line = rawLine.split('#')[0].trim(); if (!line) continue; const req = line.match(/^…
export function extractRubySymbolLines(rb: string): string[] { /* ~20 lines */ }
// ── .cursor/rules/ctxgraph--src-source-extract-rust.mdc ──
// ── src/source-extract/rust.ts ──
/** Rust symbol and import extraction. */
export function extractRustImports(rs: string): string[] { /* ~17 lines */ }
export function extractRustSymbolLines(rs: string): string[] { /* ~23 lines */ }
// ── .cursor/rules/ctxgraph--src-source-extract-ts-prompt.mdc ──
// ── src/source-extract/ts-prompt.ts ──
/** Large string templates embedded in TS (LLM pass messages, not runtime logic). */
export function isPromptTemplateBody(text: string, filePath?: string): boolean { /* prompt template (~11 lines) */ }
/** One-line export for instruction graphs (collapse prompt bodies). */
export function compactTsExportLine(sf: ts.SourceFile, node: ts.Node, filePath?: string): string { /* ~18 lines */ }
// ── .cursor/rules/ctxgraph--src-source-extract-ts-skeleton.mdc ──
// ── src/source-extract/ts-skeleton.ts ──
/**
 * Function / method / composable skeleton from `<script>` or `.ts` (no LLM).
 * Expands `computed(() => { switch ... })` into readable structure.
 */
export function extractScriptSkeleton(script: string, virtualPath: string): string[] { /* prompt template (~178 lines) */ }
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p25.mdc ──
// ── .cursor/rules/ctxgraph--src-source-extract-utils.mdc ──
// ── src/source-extract/utils.ts ──
/** Shared limits for deterministic extractors. */
export const SKELETON_MAX_CHARS = 4200;
export function truncateSkeleton(s: string, max = 280): string { const t = s.replace(/\s+/g, ' ').trim(); return t.length > max ? `${t.slice(0, max - 1)}…` : t; }
// ── .cursor/rules/ctxgraph--src-source-extract-vue-sfc.mdc ──
// ── src/source-extract/vue-sfc.ts ──
export function extractVueScriptCombined(sfc: string): string { const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; const parts: string[] = []; let m: RegExpExecArray | null; while ((m = re.exec(sfc)) !== null) { const attrs = m[1] ?? …
/**
 * For `.vue`, return extracted script + a virtual `.ts` path for the TS parser.
 * Otherwise return the file as-is.
 */
export function scriptOrSelfForAnalysis( relPath: string, content: string ): { body: string; virtualPath: string } { const norm = relPath.replace(/\\/g, '/'); if (/\.vue$/i.test(norm)) { const script = extractVueScriptCombined(content); …
export function extractVuePropKeys(script: string): string[] { /* ~30 lines */ }
/**
 * Vue `<script setup>` symbols: props, composables, top-level const/ref/computed.
 * Used when there is no `export` (typical SFC).
 */
export function extractVueSymbolLines(script: string): string[] { /* ~39 lines */ }
/** One-line template summary for instruction graphs. */
export function extractVueTemplateBrief(sfc: string): string | null { const m = sfc.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i); if (!m) return null; const one = (m[1] ?? '') .replace(/<!--[\s\S]*?-->/g, '') .replace(/\s+/g, ' ') .…
/**
 * Compact routing block for `.vue` in deterministic instructions.
 * No full script — names, props, runtime hooks only.
 */
export function buildVueRoutingSignatures(relPath: string, sfcContent: string): string[] { /* prompt template (~51 lines) */ }
/** Tag/element branches from `return` inside `computed` (e.g. LinkTag resolver). */
export function extractVueComputedBranches(script: string): string[] { /* ~17 lines */ }
// ── .cursor/rules/ctxgraph--src-writer.mdc ──
// ── src/writer.ts ──
export interface OutputFile { path: string; content: string; }
export interface WriteResult { created: string[]; updated: string[]; errors: { path: string; error: string }[]; }
/**
 * Parse LLM response with multiple fallback strategies for different output formats.
 * Tries in order:
 *   1. <<<FILE: path>>>...<<<EOF>>>
 *   2. <!-- FILE: path -->```...```
 *   3. ## FILE: path\n```...```
 *   4. ```path/to/file.ext\n...```
 */
export function parseOutputFiles(response: string): OutputFile[] { /* prompt template (~17 lines) */ }
export function writeOutputFiles(files: OutputFile[], projectRoot: string): WriteResult { /* ~33 lines */ }
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p26.mdc ──
// ── .cursor/rules/ctxgraph--test-bundle.mdc ──
// ── test/extract.test.mjs ──
/** Targets barrels only — not file purpose. */
export function extractReExportTargets() {}`;
 * Framework-aware deterministic extraction (no LLM).
 */
export function foo() {}`;

```

## Dependencies
**External:**
- ``
- `package`

## Error Handling
- `Error`: "Project directory does not exist: ${projectRoot}\n` + " (`ctxgraph--cursor-rules-bundle-p5.mdc`)

## Danger Zone 🔴
- **[env]** reads `process.env.CONTEXT_GRAPH_PROVIDER`
- **[env]** reads `process.env.CONTEXT_GRAPH_MODEL`
- **[fs]** filesystem I/O
