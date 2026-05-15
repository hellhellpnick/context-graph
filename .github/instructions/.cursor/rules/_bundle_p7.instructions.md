---
description: "Mirror — `.cursor/rules/` (4 files, part 7/20)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `ctxgraph--src-agents-catalog.mdc`
- editing or refactoring `ctxgraph--src-agents.mdc`
- editing or refactoring `ctxgraph--src-cli-agents-install.mdc`
- editing or refactoring `ctxgraph--src-cli-build-run.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-agents-catalog.mdc` (43 lines · 4 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-agents.mdc` (54 lines · 5 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-cli-agents-install.mdc` (43 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-cli-build-run.mdc` (47 lines · 3 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--src-agents-catalog.mdc ──
/**
 * Curated index of agency-agents (https://github.com/msitarzewski/agency-agents).
 *
 * Each entry describes:
 *   - where the .md file lives in the upstream repo
 *   - what project signals trigger a match
 *   - a short description for the generated README
 */
export interface AgentEntry { /* ~16 lines */ }
export interface AgentMatchRule { /** File extensions present in the project (e.g. ['.ts', '.tsx']) */ extensions?: string[]; /** File/dir names that indicate relevance (e.g. ['Dockerfile', 'docker-compose']) */ filePatterns?: RegExp[]; …
export const AGENTS_CATALOG: AgentEntry[] = [ // ── Engineering ─────────────────────────────────────────────────────────── { /* prompt template (~295 lines) */ }
/** Maximum agents to recommend by default */
export const MAX_RECOMMENDED_AGENTS = 10;

// ── .cursor/rules/ctxgraph--src-agents.mdc ──
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

// ── .cursor/rules/ctxgraph--src-cli-agents-install.mdc ──
// ── src/cli/agents-install.ts ──
export async function installRecommendedAgents( scan: ScanResult, plan: BuildPlan | null | undefined, projectRoot: string, opts: { /* ~33 lines */ }

// ── .cursor/rules/ctxgraph--src-cli-build-run.mdc ──
// ── src/cli/build-run.ts ──
export function resolveBuildStrategy( config: Config, opts: { /* ~22 lines */ }
export interface RunGraphBuildOpts { strategy: BuildStrategy; effectiveHybridMax: number; quiet: boolean; jsonOutput: boolean; repair: RepairBuildPlanOptions; getSpinner: () => Ora | null; setSpinner: (spinner: Ora | null) => void; }
export async function runGraphBuild( scan: ScanResult, config: Config, opts: RunGraphBuildOpts ): Promise<MultiPassResult> { /* ~74 lines */ }

```

## Dependencies
- No dependencies detected
