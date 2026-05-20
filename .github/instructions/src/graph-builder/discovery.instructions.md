---
description: "Mirror — `src/graph-builder/discovery.ts`"
applyTo: "src/graph-builder/discovery.ts"
priority: "P1"
last_updated: "2026-05-19"
---

## When to Read
- editing or refactoring `discovery.ts`

## Overview
- `src/graph-builder/discovery.ts` (55 lines · 2 top-level symbols) — Mirror — `src/graph-builder/discovery.ts`

## Graph
```mermaid
graph LR
  discovery[discovery]
  discovery --> writer[writer]
```

## Signatures

```typescript
// ── src/graph-builder/discovery.ts ──
export function parseSubsystemMappings(generatedFiles: OutputFile[]): SubsystemMapping[] { /* ~28 lines */ }
/** Fallback: extract subsystem paths from markdown links (old format) */
export function findMissingSubsystemPaths(generatedFiles: OutputFile[]): string[] { /* ~16 lines */ }

```

## Dependencies
**Internal:**
- `src/writer`
