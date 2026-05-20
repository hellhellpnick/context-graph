---
description: "Mirror — `src/source-extract/go.ts`"
applyTo: "src/source-extract/go.ts"
priority: "P2"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `go.ts`

## Overview
- `src/source-extract/go.ts` (76 lines · 2 top-level symbols) — Go import and symbol extraction.

## Graph
```mermaid
graph LR
  go[go]
```

## Signatures

```typescript
// ── src/source-extract/go.ts ──
/** `import "path"`, `import alias "path"`, and `import ( ... )`. */
export function extractGoImports(go: string): string[] { /* ~43 lines */ }
export function extractGoSymbolLines(go: string): string[] { /* ~23 lines */ }

```

## Dependencies
- No dependencies detected
