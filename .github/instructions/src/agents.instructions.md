---
description: "Mirror — `src/agents.ts`"
applyTo: "src/agents.ts"
priority: "P1"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `agents.ts`

## Overview
- `src/agents.ts` (308 lines · 5 top-level symbols) — Mirror — `src/agents.ts`

## Graph
```mermaid
graph LR
  agents[agents]
  agents --> agents_catalog[agents-catalog]
  agents --> graph_builder[graph-builder]
  agents --> scanner[scanner]
```

## Signatures

```typescript
// ── src/agents.ts ──
/**
 * Rank all catalog agents against the scanned project and return the top N.
 */
export function matchAgents( scan: ScanResult, plan?: BuildPlan, maxAgents = MAX_RECOMMENDED_AGENTS, ): AgentEntry[] { const ctx = buildMatchContext(scan, plan); const scored = AGENTS_CATALOG .map(entry => ({ entry, score: scoreAgent(ent…
export interface FetchedAgent { slug: string; name: string; description: string; usage: string; category: string; content: string; }
/**
 * Download agent .md files from the upstream repo.
 * Failures are logged but don't break the build.
 */
export async function fetchAgents( entries: AgentEntry[], onProgress?: (done: number, total: number, name: string) => void, ): Promise<FetchedAgent[]> { /* ~30 lines */ }
export interface AgentsWriteResult { created: string[]; updated: string[]; readmePath: string; }
/**
 * Write fetched agents to .github/agents/ and generate a README.
 */
export function writeAgents( agents: FetchedAgent[], projectRoot: string, ): AgentsWriteResult { /* ~27 lines */ }

```

## Dependencies
**Internal:**
- `src/agents-catalog`
- `src/graph-builder`
- `src/scanner`

## Danger Zone 🔴
- **[fs]** filesystem I/O
