---
description: "Mirror — `src/graph-builder/resolve-symbol.ts`"
applyTo: "src/graph-builder/resolve-symbol.ts"
priority: "P1"
last_updated: "2026-05-19"
---

## When to Read
- editing or refactoring `resolve-symbol.ts`

## Overview
- `src/graph-builder/resolve-symbol.ts` (152 lines · 6 top-level symbols) — Mirror — `src/graph-builder/resolve-symbol.ts`

## Graph
```mermaid
graph LR
  resolve_symbol[resolve-symbol]
  resolve_symbol --> types[types]
```

## Signatures

```typescript
// ── src/graph-builder/resolve-symbol.ts ──
export interface SymbolLookupRow { lookupKey: string; sourcePath: string; instructionFile: string; priority: string; }
/** Build basename / stem → instruction rows (for Q&A without open file). */
export function buildSymbolLookupRows(plan: BuildPlan): SymbolLookupRow[] { /* ~30 lines */ }
export function buildSymbolIndexMd(today: string, plan: BuildPlan): string { /* prompt template (~25 lines) */ }
export function loadSymbolLookupRows(projectRoot: string): SymbolLookupRow[] { const p = path.join(projectRoot, SYMBOL_INDEX_REL); if (!fs.existsSync(p)) return []; return parseSymbolIndexTable(fs.readFileSync(p, 'utf8')); }
/** Case-insensitive match on lookup key, basename, or source path. */
export function resolveSymbolQuery( projectRoot: string, query: string, rows?: SymbolLookupRow[] ): SymbolLookupRow[] { /* ~22 lines */ }
export function formatResolveResult( projectRoot: string, query: string, matches: SymbolLookupRow[] ): string { /* prompt template (~32 lines) */ }

```

## Dependencies
**Internal:**
- `src/graph-builder/types`

## Danger Zone 🔴
- **[fs]** filesystem I/O
