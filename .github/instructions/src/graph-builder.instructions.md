---
description: "Mirror — `src/graph-builder.ts`"
applyTo: "src/graph-builder.ts"
priority: "P2"
last_updated: "2026-05-13"
---

## When to Read
- editing or refactoring `graph-builder.ts`

## Overview
- `src/graph-builder.ts` (2824 lines · 18 exports) — Mirror — `src/graph-builder.ts`

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

```typescript
// ── src/graph-builder.ts ──
export type BuildMode = 'BUILD' | 'ACTUALIZE' | 'REVIEW' | 'IMPACT';
export interface BuildOptions { changedFiles?: string[]; targetFile?: string; existingGraphDir?: string; }
export interface GraphResult { files: OutputFile[]; rawResponse: string; usage: LLMUsage; costUSD: number | null; }
export interface MultiPassResult { files: OutputFile[]; usage: LLMUsage; costUSD: number | null; passes: number; /** Always present after Pass 0: parsed plan merged with scan coverage (no missing source files). */ plan: BuildPlan; }
/** Options for `repairBuildPlan` gap-fill / deterministic subsystem layout. */
export interface RepairBuildPlanOptions { subsystemGrouping?: SubsystemGrouping; maxFilesPerFolderSubsystem?: number; /** `mirror` (default): paths under `.github/instructions/` mirror the repo. `canonical`: legacy core/infra. */ subsyst…
export interface DeterministicBuildOptions { /** * Whether to generate smaller root files (mirrors `contextDepth: slim` behavior), * i.e. do not request index.md/metadata.json from LLM. Here it only affects * the shape of root outputs wh…
export interface BuildPlanItem { /** Relative path inside .github/instructions/, e.g. "core/scanner.instructions.md" */ file: string; area: string; priority: 'P0' | 'P1' | 'P2'; sourceFiles: string[]; /** Glob for frontmatter applyTo, e.…
export interface BuildPlan { projectName: string; projectDescription: string; techStack: string[]; buildCommand?: string; testCommand?: string; subsystems: BuildPlanItem[]; }
export interface BuildCallbacks { onPlanReady?: (plan: BuildPlan) => void; onPassComplete?: (pass: number, totalPasses: number, label: string, files: OutputFile[], cost: number | null) => void; }
export interface HybridBuildOptions { /** * Max number of subsystems to enrich with LLM notes. Remaining subsystems are deterministic-only. * Keep this small for local models and fast runs. */ maxSubsystems?: number; /** "subsystem" = on…
export function parseBuildPlan(raw: string): BuildPlan | null { // Strip markdown code fences if present const stripped = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim(); // Find first { to last } to be resilient to l…
/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairOptionsFromConfig(config: Config): RepairBuildPlanOptions { return { subsystemGrouping: config.subsystemGrouping, maxFilesPerFolderSubsystem: config.maxFilesPerFolderSubsystem, subsystemLayout: config.subsystemLayou…
/**
 * Ensures every scanned source path appears in exactly one subsystem.
 * Fills gaps from the LLM plan and replaces empty/invalid plans with a deterministic layout.
 */
export function repairBuildPlan( scan: ScanResult, rawPlan: BuildPlan | null, repairOpts?: RepairBuildPlanOptions ): BuildPlan { const allPaths = collectScannedSourcePaths(scan); const defaults = inferDefaultsFromScan(scan); let plan: Bu…
export function estimateCost(model: string, usage: LLMUsage): number | null { const pricing = PRICING[model]; if (!pricing) { const key = Object.keys(PRICING).find(k => model.startsWith(k)); if (!key) return null; const p = PRICING[key];…
/** Single-pass: for ACTUALIZE / REVIEW / IMPACT */
export async function buildGraph( scan: ScanResult, config: Config, mode: BuildMode, opts: BuildOptions = {} ): Promise<GraphResult> { const systemPrompt = loadSystemPrompt(); const provider = createProvider(config.provider); const userM…
/**
 * Deterministic BUILD (no LLM): generates a complete instruction set using static analysis only.
 * Intended for low-resource environments and for users who don't want to spend tokens.
 */
export function buildGraphDeterministic( scan: ScanResult, opts: DeterministicBuildOptions = {} ): MultiPassResult { const today = new Date().toISOString().slice(0, 10); // Deterministic plan: use coverage repair to create a complete map…
/**
 * Hybrid BUILD: always generates a deterministic scaffold for the full graph,
 * then optionally enriches root + top subsystems with LLM for better prose/graphs.
 *
 * Goal: good quality with low token usage (works well with local models).
 */
export async function buildGraphHybrid( scan: ScanResult, config: Config, callbacks: BuildCallbacks = {}, opts: HybridBuildOptions = {} ): Promise<MultiPassResult> { const { onPlanReady, onPassComplete } = callbacks; const systemPrompt =…
/** Multi-pass: for BUILD — Pass 0 (planning) → Pass 1 (root files) → Pass 2...N (subsystem files) */
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