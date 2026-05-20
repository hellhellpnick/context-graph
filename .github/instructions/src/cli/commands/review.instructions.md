---
description: "Mirror — `src/cli/commands/review.ts`"
applyTo: "src/cli/commands/review.ts"
priority: "P1"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `review.ts`

## Overview
- `src/cli/commands/review.ts` (52 lines · 1 top-level symbols) — Mirror — `src/cli/commands/review.ts`

## Graph
```mermaid
graph LR
  review[review]
  review --> io[io]
  review --> config[config]
  review --> graph_builder[graph-builder]
  review --> project_root[project-root]
  review --> scanner[scanner]
  review --> chalk["chalk"]
  review --> commander["commander"]
  review --> ora["ora"]
```

## Signatures

```typescript
// ── src/cli/commands/review.ts ──
export function registerReviewCommand(program: Command): void { /* ~41 lines */ }


// CLI commands:
//   review
```

## Dependencies
**Internal:**
- `src/cli/io`
- `src/config`
- `src/graph-builder`
- `src/project-root`
- `src/scanner`

**External:**
- `chalk`
- `commander`
- `ora`
