---
description: "Cli — src/cli.ts"
applyTo: "src/cli.ts"
priority: "P2"
last_updated: "2026-05-05"
---

## When to Read
- editing or refactoring `cli.ts`

## Overview
- `src/cli.ts` (660 lines) — Cli — src/cli.ts

## Graph
```mermaid
graph LR
  cli[cli]
  cli --> agents[agents]
  cli --> config[config]
  cli --> graph-builder[graph-builder]
  cli --> hooks[hooks]
  cli --> scanner[scanner]
  cli --> writer[writer]
  cli --> chalk["chalk · npm"]
  cli --> commander["commander · npm"]
  cli --> ora["ora · npm"]
```

## Signatures

### Notes (LLM)

```
- **build**: orchestrates project analysis and output generation, supporting hybrid and deterministic builds.
- **scanProject**: initiates project scanning with configurable limits.
```


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