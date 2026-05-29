---
description: "Mirror — `src/graph-builder/cost.ts`"
applyTo: "src/graph-builder/cost.ts"
priority: "P1"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `cost.ts`

## Overview
- `src/graph-builder/cost.ts` (14 lines · 1 top-level symbols) — Mirror — `src/graph-builder/cost.ts`

## Graph
```mermaid
graph LR
  cost[cost]
  cost --> constants[constants]
  cost --> types[types]
```

## Signatures

```typescript
// ── src/graph-builder/cost.ts ──
export function estimateCost(model: string, usage: LLMUsage): number | null { const pricing = PRICING[model]; if (!pricing) { const key = Object.keys(PRICING).find(k => model.startsWith(k)); if (!key) return null; const p = PRICING[key];…

```

## Dependencies
**Internal:**
- `src/graph-builder/constants`
- `src/providers/types`
