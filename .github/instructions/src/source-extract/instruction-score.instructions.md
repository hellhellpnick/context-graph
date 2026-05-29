---
description: "Mirror — `src/source-extract/instruction-score.ts`"
applyTo: "src/source-extract/instruction-score.ts"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `instruction-score.ts`

## Overview
- `src/source-extract/instruction-score.ts` (47 lines · 2 top-level symbols) — Mirror — `src/source-extract/instruction-score.ts`

## Graph
```mermaid
graph LR
  instruction_score[instruction-score]
  instruction_score --> paths[paths]
  instruction_score --> ts_skeleton[ts-skeleton]
  instruction_score --> vue_sfc[vue-sfc]
```

## Signatures

```typescript
// ── src/source-extract/instruction-score.ts ──
/** Score for auto split: one instruction file per “heavy” module (no LLM). */
export function instructionSplitScore(relPath: string, content: string, lines?: number): number { /* ~39 lines */ }
export const INSTRUCTION_OWN_FILE_SCORE_THRESHOLD = 42;

```

## Dependencies
**Internal:**
- `src/source-extract/paths`
- `src/source-extract/ts-skeleton`
- `src/source-extract/vue-sfc`
