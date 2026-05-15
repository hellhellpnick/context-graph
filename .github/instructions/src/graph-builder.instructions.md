---
description: "Mirror — `src/graph-builder.ts`"
applyTo: "src/graph-builder.ts"
priority: "P0"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `graph-builder.ts`

## Overview
- `src/graph-builder.ts` (6 lines · 1 top-level symbols) — Re-exports preserve backward compatibility for `import … from './graph-builder'`.

## Graph
```mermaid
graph LR
  graph_builder[graph-builder]
  graph_builder --> index[index]
```

## Signatures

```typescript
// ── src/graph-builder.ts ──
/**
 * @deprecated Import from `./graph-builder/` modules or `./graph-builder/index` instead.
 * Re-exports preserve backward compatibility for `import … from './graph-builder'`.
 */
export * from './graph-builder/index'

```

## Dependencies
**Internal:**
- `src/graph-builder`
- `src/graph-builder/index`
