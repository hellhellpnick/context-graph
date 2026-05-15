---
description: "Mirror — `src/cli/commands/impact.ts`"
applyTo: "src/cli/commands/impact.ts"
priority: "P1"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `impact.ts`

## Overview
- `src/cli/commands/impact.ts` (43 lines · 1 top-level symbols) — Mirror — `src/cli/commands/impact.ts`

## Graph
```mermaid
graph LR
  impact[impact]
  impact --> io[io]
  impact --> config[config]
  impact --> graph_builder[graph-builder]
  impact --> project_root[project-root]
  impact --> scanner[scanner]
  impact --> chalk["chalk"]
  impact --> commander["commander"]
  impact --> ora["ora"]
```

## Signatures

```typescript
// ── src/cli/commands/impact.ts ──
export function registerImpactCommand(program: Command): void { /* ~33 lines */ }


// CLI commands:
//   impact
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
