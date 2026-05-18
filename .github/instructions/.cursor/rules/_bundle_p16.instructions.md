---
description: "Mirror — `.cursor/rules/` (4 files, part 16/16)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-18"
---

## When to Read
- editing or refactoring `ctxgraph--src-source-extract.mdc`
- editing or refactoring `ctxgraph--src-writer.mdc`
- editing or refactoring `ctxgraph--test-bundle-p2.mdc`
- editing or refactoring `ctxgraph--test-bundle.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-source-extract.mdc` (116 lines · 28 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-writer.mdc` (45 lines · 4 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--test-bundle-p2.mdc` (72 lines · 3 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--test-bundle.mdc` (71 lines · 2 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--src-source-extract.mdc ──
// ── src/source-extract.ts ──
/** Prompt/message modules: prefer bundle + compact instructions (deterministic routing). */
export function isMessageOrPromptPath(relPath: string): boolean { const norm = relPath.replace(/\\/g, '/'); return ( /(?:^|\/)(?:messages|prompts?)\//i.test(norm) || /graph-create-agent/i.test(norm) || /\/(?:prompt|messages)\./i.test(nor…
/** CLI / command registration — collapse as executable, not LLM prompt template. */
export function isExecutableModulePath(relPath: string): boolean { const norm = relPath.replace(/\\/g, '/'); return ( /(?:^|\/)cli(?:\/|\.)/i.test(norm) || /(?:^|\/)commands?\//i.test(norm) || /(?:^|\/)hooks\.ts$/i.test(norm) ); }
/** Large string templates embedded in TS (LLM pass messages, not runtime logic). */
export function isPromptTemplateBody(text: string, filePath?: string): boolean { /* prompt template (~11 lines) */ }
/** One-line export for instruction graphs (collapse prompt bodies). */
export function compactTsExportLine(sf: ts.SourceFile, node: ts.Node, filePath?: string): string { /* ~18 lines */ }
/**
 * Function / method / composable skeleton from `<script>` or `.ts` (no LLM).
 * Expands `computed(() => { switch ... })` into readable structure.
 */
export function extractScriptSkeleton(script: string, virtualPath: string): string[] { /* prompt template (~178 lines) */ }
/** Score for auto split: one instruction file per “heavy” module (no LLM). */
export function instructionSplitScore(relPath: string, content: string, lines?: number): number { /* ~40 lines */ }
export const INSTRUCTION_OWN_FILE_SCORE_THRESHOLD = 42;
/** `dev/composables/foo.ts`, `src/composables/bar.js`, etc. */
export function isComposableLikePath(relPath: string): boolean { return /(?:^|\/)composables\/[^/]+\.(?:[mc]?[jt]sx?|jsx?)$/i.test(relPath.replace(/\\/g, '/')); }
/**
 * Concatenate `<script>` / `<script setup>` bodies from a Vue SFC.
 * Skips `type="application/json"` and similar non-JS blocks.
 */
export function extractVueScriptCombined(sfc: string): string { const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; const parts: string[] = []; let m: RegExpExecArray | null; while ((m = re.exec(sfc)) !== null) { const attrs = m[1] ?? …
/**
 * For `.vue`, return extracted script + a virtual `.ts` path for the TS parser.
 * Otherwise return the file as-is.
 */
export function scriptOrSelfForAnalysis( relPath: string, content: string ): { body: string; virtualPath: string } { const norm = relPath.replace(/\\/g, '/'); if (/\.vue$/i.test(norm)) { const script = extractVueScriptCombined(content); …
/** Nuxt composables / APIs used in script (for ## Runtime). */
export function extractNuxtRuntimeBullets(script: string): string[] { /* prompt template (~34 lines) */ }
/** Errors / HTTP failures without LLM (Nuxt createError + classic throws). */
export function extractDeterministicErrors(script: string, fileLabel?: string): string[] { /* prompt template (~30 lines) */ }
/** Side effects for Danger Zone (browser, stores, network, events). */
export function extractSideEffectBullets(script: string): string[] { /* prompt template (~48 lines) */ }
/** Declarations useful for counts / heuristics — no `use` / `namespace` (see `buildPhpRoutingSignatures`). */
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
/** Top-level defs / classes (heuristic, not a full parser). */
export function extractPythonSymbolLines(py: string): string[] { /* ~21 lines */ }
/** `import x` / `from pkg import` / relative `from ... import` (dependency hints). */
export function extractPythonImports(py: string): string[] { /* ~29 lines */ }
/** `import "path"`, `import alias "path"`, and `import ( ... )`. */
export function extractGoImports(go: string): string[] { /* ~43 lines */ }
/** Prop keys from `defineProps({ key: ... })` (brace-balanced heuristic). */
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
export function extractGoSymbolLines(go: string): string[] { /* ~21 lines */ }

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

// ── .cursor/rules/ctxgraph--test-bundle.mdc ──
// ── test/extract.test.mjs ──
/** Targets barrels only — not file purpose. */
export function extractReExportTargets() {}`;
 * Framework-aware deterministic extraction (no LLM).
 */
export function foo() {}`;

```

## Dependencies
- No dependencies detected

## Danger Zone 🔴
- **[env]** getenv('${m[1]}')
- **[env]** env('${m[1]}')
- **[events]** `useNuxtApp()` — global `$event` / `$listen` bus
- **[config]** runtime config / `import.meta.env`
