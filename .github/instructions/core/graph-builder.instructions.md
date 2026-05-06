---
description: "Graph Builder — src/graph-builder.ts"
applyTo: "src/graph-builder.ts"
priority: "P2"
last_updated: "2026-05-05"
---

## When to Read
- editing or refactoring `graph-builder.ts`

## Overview
- `src/graph-builder.ts` (2610 lines · 16 exports) — Graph Builder — src/graph-builder.ts

## Graph
```mermaid
graph LR
  graph-builder[graph-builder]
  graph-builder --> config[config]
  graph-builder --> providers[providers]
  graph-builder --> types[types]
  graph-builder --> scanner[scanner]
  graph-builder --> writer[writer]
  graph-builder --> typescript["typescript · npm"]
```

## Signatures

### Notes (LLM)

```
- **buildGraph**: unknown
- **buildGraphDeterministic**: unknown
- **buildGraphHybrid**: unknown
- **buildGraphMultiPass**: unknown
- **estimateCost**: unknown
- **parseBuildPlan**: unknown
- **repairBuildPlan**: unknown
```


```typescript
// ── src/graph-builder.ts ──
export type BuildMode = 'BUILD' | 'ACTUALIZE' | 'REVIEW' | 'IMPACT';
export interface BuildOptions { changedFiles?: string[]; targetFile?: string; existingGraphDir?: string; }
export interface GraphResult { files: OutputFile[]; rawResponse: string; usage: LLMUsage; costUSD: number | null; }
export interface MultiPassResult { files: OutputFile[]; usage: LLMUsage; costUSD: number | null; passes: number; /** Always present after Pass 0: parsed plan merged with scan coverage (no missing source files). */ plan: BuildPlan; }
export interface DeterministicBuildOptions { /** * Whether to generate smaller root files (mirrors `contextDepth: slim` behavior), * i.e. do not request index.md/metadata.json from LLM. Here it only affects * the shape of root outputs wh…
export interface BuildPlanItem { /** Relative path inside .github/instructions/, e.g. "core/scanner.instructions.md" */ file: string; area: string; priority: 'P0' | 'P1' | 'P2'; sourceFiles: string[]; /** Glob for frontmatter applyTo, e.…
export interface BuildPlan { projectName: string; projectDescription: string; techStack: string[]; buildCommand?: string; testCommand?: string; subsystems: BuildPlanItem[]; }
export interface BuildCallbacks { onPlanReady?: (plan: BuildPlan) => void; onPassComplete?: (pass: number, totalPasses: number, label: string, files: OutputFile[], cost: number | null) => void; }
export interface HybridBuildOptions { /** * Max number of subsystems to enrich with LLM notes. Remaining subsystems are deterministic-only. * Keep this small for local models and fast runs. */ maxSubsystems?: number; /** "subsystem" = on…
export function parseBuildPlan(raw: string): BuildPlan | null { // Strip markdown code fences if present const stripped = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim(); // Find first { to last } to be resilient to l…
export function repairBuildPlan(scan: ScanResult, rawPlan: BuildPlan | null): BuildPlan { const allPaths = collectScannedSourcePaths(scan); const defaults = inferDefaultsFromScan(scan); let plan: BuildPlan = rawPlan?.subsystems?.length ?…
export function estimateCost(model: string, usage: LLMUsage): number | null { const pricing = PRICING[model]; if (!pricing) { const key = Object.keys(PRICING).find(k => model.startsWith(k)); if (!key) return null; const p = PRICING[key];…
export async function buildGraph( scan: ScanResult, config: Config, mode: BuildMode, opts: BuildOptions = {} ): Promise<GraphResult> { const systemPrompt = loadSystemPrompt(); const provider = createProvider(config.provider); const userM…
export function buildGraphDeterministic( scan: ScanResult, opts: DeterministicBuildOptions = {} ): MultiPassResult { const today = new Date().toISOString().slice(0, 10); // Deterministic plan: use coverage repair to create a complete map…
export async function buildGraphHybrid( scan: ScanResult, config: Config, callbacks: BuildCallbacks = {}, opts: HybridBuildOptions = {} ): Promise<MultiPassResult> { const { onPlanReady, onPassComplete } = callbacks; const systemPrompt =…
export async function buildGraphMultiPass( scan: ScanResult, config: Config, callbacks: BuildCallbacks = {} ): Promise<MultiPassResult> { const { onPlanReady, onPassComplete } = callbacks; const systemPrompt = loadSystemPrompt(); const p…


// CLI commands:
//   build
```

## Dependencies
**Internal:**
- `src/config`
- `src/providers`
- `src/providers/types`
- `src/scanner`
- `src/writer`

**External (npm):**
- `typescript`

## Error Handling
- `Error`: "context-graph system prompt not found. Try reinstalling the package." (`graph-builder.ts`)

## Danger Zone 🔴
- No env vars or side effects detected