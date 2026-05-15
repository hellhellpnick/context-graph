---
description: "Mirror — `src/index.ts`"
applyTo: "src/index.ts"
priority: "P0"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `index.ts`

## Overview
- `src/index.ts` (63 lines · 17 top-level symbols) — Programmatic API — for embedding context-graph in other tools

## Graph
```mermaid
graph LR
  index[index]
  index --> agents[agents]
  index --> agents_catalog[agents-catalog]
  index --> config[config]
  index --> graph_builder[graph-builder]
  index --> hooks[hooks]
  index --> project_root[project-root]
  index --> providers[providers]
  index --> scanner[scanner]
```

## Signatures

```typescript
// ── src/index.ts ──
export { loadConfig, initConfig, initConfigInteractive, getModelMaxTokens, MODEL_MAX_OUTPUT_TOKENS, providerAllowsMissingApiKey, } from './config'
export type { Config, ContextDepth, SubsystemGrouping, SubsystemLayout } from './config'
export { scanProject, formatForLLM, classifyFile, scanForPromptDepth, GRAPH_CONTEXT_IGNORE_FILENAMES } from './scanner'
export type { ScannedFile, ScanResult } from './scanner'
export { resolveProjectRoot, tryGitRepositoryRoot, normalizeBuildDirArg, assertProjectRootExists, suggestedBuildFlagForMistake, } from './project-root'
export type { BuildDirNormalization, MistakenBuildModeFlag } from './project-root'
export { buildGraph, buildGraphMultiPass, buildGraphDeterministic, estimateCost, parseBuildPlan, repairBuildPlan, repairOptionsFromConfig, } from './graph-builder'
export type { BuildMode, BuildOptions, GraphResult, MultiPassResult, BuildPlan, BuildPlanItem, BuildCallbacks, RepairBuildPlanOptions, DeterministicBuildOptions, HybridBuildOptions, } from './graph-builder'
export { parseOutputFiles, writeOutputFiles } from './writer'
export type { OutputFile, WriteResult } from './writer'
export { installPrePushHook, saveLastBuildRef, getChangedFilesSinceLastBuild, filterSignificantFiles, } from './hooks'
export { createProvider } from './providers'
export type { LLMProvider, LLMMessage, LLMUsage, LLMResponse, ProviderConfig } from './providers'
export { matchAgents, fetchAgents, writeAgents } from './agents'
export type { FetchedAgent, AgentsWriteResult } from './agents'
export { AGENTS_CATALOG, MAX_RECOMMENDED_AGENTS } from './agents-catalog'
export type { AgentEntry, AgentMatchRule } from './agents-catalog'

```

## Dependencies
**Internal:**
- `src/agents`
- `src/agents-catalog`
- `src/config`
- `src/graph-builder`
- `src/hooks`
- `src/project-root`
- `src/providers`
- `src/scanner`
- `src/writer`
