---
description: "Mirror — `src/cli/agents-install.ts`"
applyTo: "src/cli/agents-install.ts"
priority: "P1"
last_updated: "2026-05-18"
---

## When to Read
- editing or refactoring `agents-install.ts`

## Overview
- `src/cli/agents-install.ts` (40 lines · 1 top-level symbols) — Mirror — `src/cli/agents-install.ts`

## Graph
```mermaid
graph LR
  agents_install[agents-install]
  agents_install --> agents[agents]
  agents_install --> graph_builder[graph-builder]
  agents_install --> scanner[scanner]
  agents_install --> chalk["chalk"]
  agents_install --> ora["ora"]
```

## Signatures

```typescript
// ── src/cli/agents-install.ts ──
export async function installRecommendedAgents( scan: ScanResult, plan: BuildPlan | null | undefined, projectRoot: string, opts: { /* ~33 lines */ }

```

## Dependencies
**Internal:**
- `src/agents`
- `src/graph-builder`
- `src/scanner`

**External:**
- `chalk`
- `ora`
