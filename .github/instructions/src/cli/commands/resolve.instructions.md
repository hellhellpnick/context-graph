---
description: "Mirror — `src/cli/commands/resolve.ts`"
applyTo: "src/cli/commands/resolve.ts"
priority: "P1"
last_updated: "2026-05-19"
---

## When to Read
- editing or refactoring `resolve.ts`

## Overview
- `src/cli/commands/resolve.ts` (46 lines · 1 top-level symbols) — Mirror — `src/cli/commands/resolve.ts`

## Graph
```mermaid
graph LR
  resolve[resolve]
  resolve --> io[io]
  resolve --> resolve_symbol[resolve-symbol]
  resolve --> project_graph[project-graph]
  resolve --> project_root[project-root]
  resolve --> chalk["chalk"]
  resolve --> commander["commander"]
```

## Signatures

```typescript
// ── src/cli/commands/resolve.ts ──
export function registerResolveCommand(program: Command): void { /* ~38 lines */ }


// CLI commands:
//   resolve
```

## Dependencies
**Internal:**
- `src/cli/io`
- `src/graph-builder/resolve-symbol`
- `src/project-graph`
- `src/project-root`

**External:**
- `chalk`
- `commander`
