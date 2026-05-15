---
description: "Mirror — `src/graph-builder/deterministic/metadata.ts`"
applyTo: "src/graph-builder/deterministic/metadata.ts"
priority: "P1"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `metadata.ts`

## Overview
- `src/graph-builder/deterministic/metadata.ts` (120 lines · 3 top-level symbols) — Mirror — `src/graph-builder/deterministic/metadata.ts`

## Graph
```mermaid
graph LR
  metadata[metadata]
  metadata --> priority[priority]
  metadata --> types[types]
  metadata --> scanner[scanner]
```

## Signatures

```typescript
// ── src/graph-builder/deterministic/metadata.ts ──
export function buildMetadataJson(today: string, scan: ScanResult, plan?: BuildPlan): string { /* ~49 lines */ }
/** Flat table: every instruction path ↔ applyTo ↔ sources (for LLMs and search). */
export function buildContextGraphPathIndexMd(today: string, plan: BuildPlan): string { /* prompt template (~20 lines) */ }
/** Build index.md content from plan subsystems — no LLM guessing */
export function buildIndexMd(today: string, plan?: BuildPlan): string { /* prompt template (~42 lines) */ }

```

## Dependencies
**Internal:**
- `src/graph-builder/plan/priority`
- `src/graph-builder/types`
- `src/scanner`
