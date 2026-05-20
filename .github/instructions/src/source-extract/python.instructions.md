---
description: "Mirror — `src/source-extract/python.ts`"
applyTo: "src/source-extract/python.ts"
priority: "P2"
last_updated: "2026-05-19"
---

## When to Read
- editing or refactoring `python.ts`

## Overview
- `src/source-extract/python.ts` (55 lines · 2 top-level symbols) — Python symbol and import extraction.

## Graph
```mermaid
graph LR
  python[python]
```

## Signatures

```typescript
// ── src/source-extract/python.ts ──
/** Python symbol and import extraction. */
export function extractPythonSymbolLines(py: string): string[] { /* ~21 lines */ }
/** `import x` / `from pkg import` / relative `from ... import` (dependency hints). */
export function extractPythonImports(py: string): string[] { /* ~29 lines */ }

```

## Dependencies
- No dependencies detected
