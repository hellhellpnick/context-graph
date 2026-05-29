---
description: "Mirror — `src/cli/commands/agents.ts`"
applyTo: "src/cli/commands/agents.ts"
priority: "P1"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `agents.ts`

## Overview
- `src/cli/commands/agents.ts` (86 lines · 1 top-level symbols) — Mirror — `src/cli/commands/agents.ts`

## Graph
```mermaid
graph LR
  agents[agents]
  agents --> io[io]
  agents --> project_root[project-root]
  agents --> scanner[scanner]
  agents --> chalk["chalk"]
  agents --> commander["commander"]
  agents --> ora["ora"]
```

## Signatures

```typescript
// ── src/cli/commands/agents.ts ──
export function registerAgentsCommand(program: Command): void { /* ~77 lines */ }


// CLI commands:
//   agents
```

## Dependencies
**Internal:**
- `src/agents`
- `src/cli/io`
- `src/project-root`
- `src/scanner`

**External:**
- `chalk`
- `commander`
- `ora`
