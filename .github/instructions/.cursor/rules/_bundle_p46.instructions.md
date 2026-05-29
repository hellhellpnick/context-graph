---
description: "Mirror — `.cursor/rules/` (4 files, part 46/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--src-source-extract-go.mdc`
- editing or refactoring `ctxgraph--src-source-extract-index.mdc`
- editing or refactoring `ctxgraph--src-source-extract-instruction-score.mdc`
- editing or refactoring `ctxgraph--src-source-extract-java-kotlin.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-source-extract-go.mdc` (33 lines · 2 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-source-extract-index.mdc` (68 lines · 13 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-source-extract-instruction-score.mdc` (39 lines · 2 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-source-extract-java-kotlin.mdc` (33 lines · 2 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
```

## Signatures

```typescript
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

// ── .cursor/rules/ctxgraph--src-source-extract-java-kotlin.mdc ──
// ── src/source-extract/java-kotlin.ts ──
/** Java / Kotlin symbol and import extraction. */
export function extractJavaKotlinImports(src: string): string[] { const out: string[] = []; for (const rawLine of src.replace(/\r\n/g, '\n').split('\n')) { const t = rawLine.trim(); if (!t || t.startsWith('//') || t.startsWith('/*')) con…
export function extractJavaKotlinSymbolLines(src: string): string[] { /* ~29 lines */ }

```

## Dependencies
**External:**
- ``
