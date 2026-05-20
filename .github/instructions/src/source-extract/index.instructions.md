---
description: "Mirror — `src/source-extract/index.ts`"
applyTo: "src/source-extract/index.ts"
priority: "P0"
last_updated: "2026-05-19"
---

## When to Read
- editing or refactoring `index.ts`

## Overview
- `src/source-extract/index.ts` (36 lines · 9 top-level symbols) — Shared helpers for Vue / PHP / Python / Go — scanner + deterministic graph.

## Graph
```mermaid
graph LR
  index[index]
  index --> go[go]
  index --> instruction_score[instruction-score]
  index --> nuxt_runtime[nuxt-runtime]
  index --> paths[paths]
  index --> php[php]
  index --> python[python]
  index --> ts_prompt[ts-prompt]
  index --> ts_skeleton[ts-skeleton]
```

## Signatures

```typescript
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

```

## Dependencies
**Internal:**
- `src/source-extract/go`
- `src/source-extract/instruction-score`
- `src/source-extract/nuxt-runtime`
- `src/source-extract/paths`
- `src/source-extract/php`
- `src/source-extract/python`
- `src/source-extract/ts-prompt`
- `src/source-extract/ts-skeleton`
- `src/source-extract/vue-sfc`
