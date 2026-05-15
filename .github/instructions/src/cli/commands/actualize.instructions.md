---
description: "Mirror — `src/cli/commands/actualize.ts`"
applyTo: "src/cli/commands/actualize.ts"
priority: "P1"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `actualize.ts`

## Overview
- `src/cli/commands/actualize.ts` (116 lines · 1 top-level symbols) — Mirror — `src/cli/commands/actualize.ts`

## Graph
```mermaid
graph LR
  actualize[actualize]
  actualize --> io[io]
  actualize --> config[config]
  actualize --> graph_builder[graph-builder]
  actualize --> hooks[hooks]
  actualize --> project_root[project-root]
  actualize --> scanner[scanner]
  actualize --> writer[writer]
  actualize --> chalk["chalk"]
  actualize --> commander["commander"]
  actualize --> ora["ora"]
```

## Signatures

```typescript
// ── src/cli/commands/actualize.ts ──
export function registerActualizeCommand(program: Command): void { /* ~102 lines */ }


// CLI commands:
//   actualize
```

## Dependencies
**Internal:**
- `src/cli/io`
- `src/config`
- `src/graph-builder`
- `src/hooks`
- `src/project-root`
- `src/scanner`
- `src/writer`

**External:**
- `chalk`
- `commander`
- `ora`

## Danger Zone 🔴
- **[fs]** filesystem I/O
