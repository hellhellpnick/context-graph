---
description: "Mirror — `.cursor/rules/` (4 files, part 13/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-bundle-p33.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p34.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p35.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p36.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p33.mdc` (68 lines · 15 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p34.mdc` (74 lines · 19 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p35.mdc` (87 lines · 15 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p36.mdc` (60 lines · 8 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
  Rules --> ENV{{"env / config"}}
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p33.mdc ──
// ── .cursor/rules/ctxgraph--src-providers-index.mdc ──
// ── src/providers/index.ts ──
export function createProvider(config: ProviderConfig): LLMProvider { switch (config.provider) { case 'openai': case 'openai-compat': case 'ollama': return new OpenAIProvider(config); case 'anthropic': return new AnthropicProvider(config…
export type { LLMProvider, LLMMessage, LLMUsage, LLMResponse, ProviderConfig } from './types'
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

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p34.mdc ──
// ── .cursor/rules/ctxgraph--src-source-extract-csharp.mdc ──
// ── src/source-extract/csharp.ts ──
export function extractCSharpSymbolLines(cs: string): string[] { /* ~43 lines */ }
/** `using Foo.Bar;`, `global using`, `using static`. */
export function extractCSharpImports(cs: string): string[] { const out: string[] = []; for (const rawLine of cs.replace(/\r\n/g, '\n').split('\n')) { const t = rawLine.trim(); if (!t || t.startsWith('//')) continue; const m = t.match(/^(…
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
export { isInstructionExcludedPath, isMessageOrPromptPath, isExecutableModulePath, isComposableLikePath, } from './paths'
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

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p35.mdc ──
// ── .cursor/rules/ctxgraph--src-source-extract-java-kotlin.mdc ──
// ── src/source-extract/java-kotlin.ts ──
/** Java / Kotlin symbol and import extraction. */
export function extractJavaKotlinImports(src: string): string[] { const out: string[] = []; for (const rawLine of src.replace(/\r\n/g, '\n').split('\n')) { const t = rawLine.trim(); if (!t || t.startsWith('//') || t.startsWith('/*')) con…
export function extractJavaKotlinSymbolLines(src: string): string[] { /* ~29 lines */ }
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
/**
 * Markup / MSBuild / designer artifacts — keep in scan tree, omit from instruction subsystems.
 * Logic lives in `.cs`, `.xaml.cs`, ViewModels; dumping XAML/csproj into ## Source adds noise.
 */
export function isInstructionExcludedPath(relPath: string): boolean { const norm = relPath.replace(/\\/g, '/'); const base = path.posix.basename(norm); if (/\.(xaml|axaml|csproj|props|targets|resw|pubxml)$/i.test(base)) return true; if (…
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
/** Top-level `use Foo\Bar;` / `use A, B;` — first segment only per clause. */
export function extractPhpUseStatements(php: string): string[] { const out: string[] = []; const s = php.replace(/\r\n/g, '\n'); const re = /^\s*use\s+([^;]+);/gm; let m: RegExpExecArray | null; while ((m = re.exec(s)) !== null) { const …

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p36.mdc ──
// ── .cursor/rules/ctxgraph--src-source-extract-python.mdc ──
// ── src/source-extract/python.ts ──
/** Python symbol and import extraction. */
export function extractPythonSymbolLines(py: string): string[] { /* ~22 lines */ }
/** `import x` / `from pkg import` / relative `from ... import` (dependency hints). */
export function extractPythonImports(py: string): string[] { /* ~29 lines */ }
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

```

## Dependencies
**External:**
- ``

## Danger Zone 🔴
- **[env]** getenv('${m[1]}')
- **[env]** env('${m[1]}')
- **[events]** `useNuxtApp()` — global `$event` / `$listen` bus
- **[config]** runtime config / `import.meta.env`
