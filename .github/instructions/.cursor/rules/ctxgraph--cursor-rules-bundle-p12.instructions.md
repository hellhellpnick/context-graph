---
description: "Mirror — `.cursor/rules/ctxgraph--cursor-rules-bundle-p12.mdc`"
applyTo: ".cursor/rules/ctxgraph--cursor-rules-bundle-p12.mdc"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-bundle-p12.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p12.mdc` (189 lines · 59 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  ctxgraph__cursor_rules_bundle_p12[ctxgraph--cursor-rules-bundle-p12]
  ctxgraph__cursor_rules_bundle_p12 --> node[""]
  ctxgraph__cursor_rules_bundle_p12 --> package["package"]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p12.mdc ──
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
export { extractJavaKotlinImports,

```

## Dependencies
**External:**
- ``
- `package`

## Error Handling
- `Error`: "Project directory does not exist: ${projectRoot}\n` + " (`ctxgraph--cursor-rules-bundle-p12.mdc`)

## Danger Zone 🔴
- **[fs]** filesystem I/O
