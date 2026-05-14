---
description: "Mirror — `src/cli.ts`"
applyTo: "src/cli.ts"
priority: "P2"
last_updated: "2026-05-13"
---

## When to Read
- editing or refactoring `cli.ts`

## Overview
- `src/cli.ts` (723 lines) — Mirror — `src/cli.ts`

## Graph
```mermaid
graph LR
  cli[cli]
  cli --> agents[agents]
  cli --> config[config]
  cli --> graph-builder[graph-builder]
  cli --> hooks[hooks]
  cli --> project-root[project-root]
  cli --> scanner[scanner]
  cli --> writer[writer]
  cli --> chalk["chalk · npm"]
  cli --> commander["commander · npm"]
  cli --> ora["ora · npm"]
  cli --> ENV{{"env vars"}}
```

## Signatures

```typescript
(no explicit exports found — check source files below)

// CLI commands:
//   build
//   actualize
//   review
//   impact
//   validate
//   hook-check
//   agents
```

## Dependencies
**Internal:**
- `src/agents`
- `src/config`
- `src/graph-builder`
- `src/hooks`
- `src/project-root`
- `src/scanner`
- `src/writer`

**External (npm):**
- `chalk`
- `commander`
- `ora`

## Error Handling
- No explicit throws detected

## Danger Zone 🔴
- Reads `process.env.CONTEXT_GRAPH_PROVIDER`
- Reads `process.env.CONTEXT_GRAPH_MODEL`