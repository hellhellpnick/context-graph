---
description: "Mirror — `src/graph-builder/deterministic/subsystem.ts`"
applyTo: "src/graph-builder/deterministic/subsystem.ts"
priority: "P1"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `subsystem.ts`

## Overview
- `src/graph-builder/deterministic/subsystem.ts` (298 lines · 1 top-level symbols) — Mirror — `src/graph-builder/deterministic/subsystem.ts`

## Graph
```mermaid
graph LR
  subsystem[subsystem]
  subsystem --> framework_extract[framework-extract]
  subsystem --> exports[exports]
  subsystem --> imports[imports]
  subsystem --> misc[misc]
  subsystem --> types[types]
  subsystem --> scanner[scanner]
  subsystem --> source_extract[source-extract]
  subsystem --> writer[writer]
```

## Signatures

```typescript
// ── src/graph-builder/deterministic/subsystem.ts ──
export function buildDeterministicSubsystemFile( today: string, instructionPath: string, planItem: BuildPlanItem | undefined, scan: ScanResult, sourceFiles: string[] ): OutputFile { /* prompt template (~265 lines) */ }

```

## Dependencies
**Internal:**
- `src/framework-extract`
- `src/graph-builder/extract/exports`
- `src/graph-builder/extract/imports`
- `src/graph-builder/extract/misc`
- `src/graph-builder/types`
- `src/scanner`
- `src/source-extract`
- `src/writer`
