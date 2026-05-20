---
description: "Mirror — `src/graph-builder/extract/deps-graph.ts`"
applyTo: "src/graph-builder/extract/deps-graph.ts"
priority: "P1"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `deps-graph.ts`

## Overview
- `src/graph-builder/extract/deps-graph.ts` (209 lines · 6 top-level symbols) — Mirror — `src/graph-builder/extract/deps-graph.ts`

## Graph
```mermaid
graph LR
  deps_graph[deps-graph]
  deps_graph --> constants[constants]
  deps_graph --> prompt[prompt]
  deps_graph --> scanner[scanner]
  deps_graph --> source_extract[source-extract]
  deps_graph --> typescript["typescript"]
```

## Signatures

```typescript
// ── src/graph-builder/extract/deps-graph.ts ──
export const TS_JS_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.go', '.py'];
export function isTsJsLikePath(p: string): boolean { return /\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i.test(p); }
export function stripKnownExt(p: string): string { return p.replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue|go|py)$/i, ''); }
export function extractImportSpecifiersFromTsAst(filePath: string, content: string): string[] { /* ~29 lines */ }
export function resolveInternalImport( fromFile: string, spec: string, existingPaths: Set<string> ): string | null { /* ~30 lines */ }
export function buildDeterministicDependencyGraph( scan: ScanResult, opts?: { /* prompt template (~129 lines) */ }

```

## Dependencies
**Internal:**
- `src/graph-builder/constants`
- `src/graph-builder/prompt`
- `src/scanner`
- `src/source-extract`

**External:**
- `typescript`
