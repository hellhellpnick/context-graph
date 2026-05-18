---
description: "Mirror — `src/cli/commands/hook-check.ts`"
applyTo: "src/cli/commands/hook-check.ts"
priority: "P1"
last_updated: "2026-05-18"
---

## When to Read
- editing or refactoring `hook-check.ts`

## Overview
- `src/cli/commands/hook-check.ts` (82 lines · 1 top-level symbols) — Mirror — `src/cli/commands/hook-check.ts`

## Graph
```mermaid
graph LR
  hook_check[hook-check]
  hook_check --> io[io]
  hook_check --> config[config]
  hook_check --> graph_builder[graph-builder]
  hook_check --> hooks[hooks]
  hook_check --> project_root[project-root]
  hook_check --> scanner[scanner]
  hook_check --> writer[writer]
  hook_check --> chalk["chalk"]
  hook_check --> commander["commander"]
  hook_check --> ora["ora"]
```

## Signatures

```typescript
// ── src/cli/commands/hook-check.ts ──
export function registerHookCheckCommand(program: Command): void { /* ~69 lines */ }


// CLI commands:
//   hook-check
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
