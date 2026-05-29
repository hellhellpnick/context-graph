---
description: "Mirror — `.cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-ctxgraph-cursor-rules-bundle-p2.mdc`"
applyTo: ".cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-ctxgraph-cursor-rules-bundle-p2.mdc"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-ctxgraph-cursor-rules-ctxgraph-cursor-rules-bundle-p2.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-ctxgraph-cursor-rules-bundle-p2.mdc` (133 lines · 63 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  ctxgraph__cursor_rules_ctxgraph_cursor_rules_ctxgraph_cursor_rules_bundle_p2[ctxgraph--cursor-rules-ctxgraph-cursor-rules-ctxgraph-cursor-rules-bundle-p2]
  ctxgraph__cursor_rules_ctxgraph_cursor_rules_ctxgraph_cursor_rules_bundle_p2 --> node[""]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-ctxgraph-cursor-rules-bundle-p2.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-bundle-p2.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p2.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p13.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-plan-stack-profile.mdc ──
// ── src/graph-builder/plan/stack-profile.ts ──
export type ProjectStackProfile = { laravel: boolean; php: boolean; node: boolean; vue: boolean; nuxt: boolean; /** Repo-relative directory containing `nuxt.config.*` (e.g. `frontend/dev`). */ nuxtRoot?: string; };
/** First `nuxt.config.*` path in scan order (stable). */
export function findNuxtConfigPath(scan: ScanResult): string | undefined { for (const f of scan.files) { const p = f.path.replace(/\\/g, '/'); if (NUXT_CONFIG_RE.test(p)) return p; } return undefined; }
export function countScannedVueFiles(scan: ScanResult): number { return scan.files.filter(f => f.path.endsWith('.vue') && f.tier !== 3).length; }
export function detectProjectStackProfile(scan: ScanResult): ProjectStackProfile { /* ~24 lines */ }
/** Auto `by-folder` for Laravel / large PHP trees / Nuxt & large Vue apps. */
export function shouldAutoFolderGrouping( scan: ScanResult, profile: ProjectStackProfile, subsystemGrouping: 'default' | 'by-folder' ): boolean { /* ~16 lines */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-prompt.mdc ──
// ── src/graph-builder/prompt.ts ──
/** Node / Python / Rust / PHP env access heuristics for Danger Zone + mermaid. */
export function fileReadsEnvironment(content: string): boolean { return /process\.env|os\.environ|os\.getenv\s*\(|std::env|getenv\s*\(|(?:^|[^\w$.])env\s*\(\s*['"][^'"]+['"]|(?:^|[^\w$])\$_ENV(?:\[|\b)|(?:^|[^\w$])\$_SERVER\s*\[/i.test( …
export function styleDirective(config: Config, target: 'notes' | 'root' | 'subsystem'): string { /* prompt template (~17 lines) */ }
export function loadSystemPrompt(): string { const candidates = [ path.join(__dirname, '../../prompts/graph-create-agent.md'), path.join(__dirname, '../../../graph-create-agent.md'), path.join(process.cwd(), 'graph-create-agent.md'), ]; …
export function loadExistingGraph(graphDir: string): string { const rootFile = path.join(graphDir, 'copilot-instructions.md'); if (!fs.existsSync(rootFile)) return ''; return fs.readFileSync(rootFile, 'utf8'); }
// ── .cursor/rules/ctxgraph--src-graph-builder-resolve-symbol.mdc ──
// ── src/graph-builder/resolve-symbol.ts ──
export interface SymbolLookupRow { lookupKey: string; sourcePath: string; instructionFile: string; priority: string; }
/** Build basename / stem → instruction rows (for Q&A without open file). */
export function buildSymbolLookupRows(plan: BuildPlan): SymbolLookupRow[] { /* ~30 lines */ }
export function buildSymbolIndexMd(today: string, plan: BuildPlan): string { /* prompt template (~25 lines) */ }
export function loadSymbolLookupRows(projectRoot: string): SymbolLookupRow[] { const p = path.join(projectRoot, SYMBOL_INDEX_REL); if (!fs.existsSync(p)) return []; return parseSymbolIndexTable(fs.readFileSync(p, 'utf8')); }
/** Case-insensitive match on lookup key, basename, or source path. */
export function resolveSymbolQuery( projectRoot: string, query: string, rows?: SymbolLookupRow[] ): SymbolLookupRow[] { /* ~22 lines */ }
export function formatResolveResult( projectRoot: string, query: string, matches: SymbolLookupRow[] ): string { /* prompt template (~32 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-types.mdc ──
// ── src/graph-builder/types.ts ──
export type BuildMode = 'BUILD' | 'ACTUALIZE' | 'REVIEW' | 'IMPACT';
export interface BuildOptions { changedFiles?: string[]; targetFile?: string; existingGraphDir?: string; }
export interface GraphResult { files: OutputFile[]; rawResponse: string; usage: LLMUsage; costUSD: number | null; }
export interface MultiPassResult { files: OutputFile[]; usage: LLMUsage; costUSD: number | null; passes: number; /** Always present after Pass 0: parsed plan merged with scan coverage (no missing source files). */ plan: BuildPlan; }
/** Options for `repairBuildPlan` gap-fill / deterministic subsystem layout. */
export interface RepairBuildPlanOptions { subsystemGrouping?: SubsystemGrouping; maxFilesPerFolderSubsystem?: number; /** `mirror` (default): paths under `.github/instructions/` mirror the repo. `canonical`: legacy core/infra. */ subsyst…
export interface DeterministicBuildOptions { /* ~14 lines */ }
export interface BuildPlanItem { /** Relative path inside .github/instructions/, e.g. "core/scanner.instructions.md" */ file: string; area: string; priority: 'P0' | 'P1' | 'P2'; sourceFiles: string[]; /** Glob for frontmatter applyTo, e.…
export interface BuildPlan { projectName: string; projectDescription: string; techStack: string[]; buildCommand?: string; testCommand?: string; subsystems: BuildPlanItem[]; }
export interface BuildCallbacks { onPlanReady?: (plan: BuildPlan) => void; onPassComplete?: (pass: number, totalPasses: number, label: string, files: OutputFile[], cost: number | null) => void; }
export interface HybridBuildOptions { /** * Max number of subsystems to enrich with LLM notes. Remaining subsystems are deterministic-only. * Keep this small for local models and fast runs. */ maxSubsystems?: number; /** "subsystem" = on…
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p14.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder.mdc ──
// ── src/graph-builder.ts ──
/**
 * @deprecated Import from `./graph-builder/` modules or `./graph-builder/index` instead.
 * Re-exports preserve backward compatibility for `import … from './graph-builder'`.
 */
export * from './graph-builder/index'
// ── .cursor/rules/ctxgraph--src-hooks.mdc ──
// ── src/hooks.ts ──
export function installPrePushHook(projectRoot: string): 'installed' | 'updated' | 'skipped' { /* ~20 lines */ }
export function saveLastBuildRef(projectRoot: string): void { const refFile = path.join(projectRoot, '.context-graph-last-build'); try { const sha = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', '…
export function getChangedFilesSinceLastBuild(projectRoot: string): string[] { /* ~28 lines */ }
export function filterSignificantFiles(files: string[]): string[] { return files.filter(f => { const tier = classifyFile(f); return tier === 0 || tier === 1 || tier === 2; }); }
// ── .cursor/rules/ctxgraph--src-index.mdc ──
// ── src/index.ts ──
export { loadConfig, initConfig, initConfigInteractive, getModelMaxTokens, MODEL_MAX_OUTPUT_TOKENS, providerAllowsMissingApiKey, } from './config'
export type { Config, ContextDepth, SubsystemGrouping, SubsystemLayout, InstructionTargetId } from './config'
export { INSTRUCTION_TARGET_IDS, INSTRUCTION_TARGET_LABELS, hasConfiguredInstructionTargets, hasConfiguredInstallAgents, needsInstructionTargetSetup, needsInstallAgentsSetup, normalizeInstructionTargets, parseInstallAgentsEnv, resolveIns…
export { scanProject, formatForLLM, classifyFile, scanForPromptDepth, GRAPH_CONTEXT_IGNORE_FILENAMES } from './scanner'
export type { ScannedFile, ScanResult } from './scanner'
export { resolveProjectRoot, tryGitRepositoryRoot, normalizeBuildDirArg, assertProjectRootExists, suggestedBuildFlagForMistake, } from './project-root'
export type { BuildDirNormalization, MistakenBuildModeFlag } from './project-root'
export { buildGraph, buildGraphMultiPass, buildGraphDeterministic, estimateCost, parseBuildPlan, repairBuildPlan, repairOptionsFromConfig, resolveRepairOptions, } from './graph-builder'
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
// ── .cursor/rules/ctxgraph--src-instruction-targets.mdc ──
// ── src/instruction-targets.ts ──
/**
 * Which AI tool entrypoints context-graph emits (adapters + tool-specific files).
 * Core graph (`.github/instructions/*.instructions.md`, index, path-index) is always built.
 */
export type InstructionTargetId = | 'copilot' | 'cursor' | 'claude' | 'agents' | 'gemini' | 'windsurf' | 'codex' | 'cline';
export const INSTRUCTION_TARGET_IDS: InstructionTargetId[] = [ 'copilot', 'cursor', 'claude', 'agents', 'gemini', 'windsurf', 'codex', 'cline', ];
export const INSTRUCTION_TARGET_LABELS: Record<InstructionTargetId, string> = { copilot: 'GitHub Copilot (.github/copilot-instructions.md, .copilotignore)', cursor: 'Cursor (.cursor/rules/context-graph.mdc + ctxgraph--*.mdc per file)', c…
export interface DeterministicPreferences { instructionTargets: InstructionTargetId[]; installAgents: boolean; }
export function isInstructionTargetId(v: string): v is InstructionTargetId { return TARGET_SET.has(v); }
export function normalizeInstructionTargets(raw: unknown): InstructionTargetId[] | null { /* ~17 lines */ }
export function parseInstructionTargetsEnv(envVal: string | undefined): InstructionTargetId[] | null { if (!envVal?.trim()) return null; if (envVal.trim().toLowerCase() === 'all') return [...INSTRUCTION_TARGET_IDS]; const parts = envVal.…
export function parseInstallAgentsEnv(envVal: string | undefined): boolean | null { if (!envVal?.trim()) return null; const v = envVal.trim().toLowerCase(); if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true; if (v =…
export function instructionTargetsFromConfigFile( fileConfig: { instructionTargets?: unknown } ): InstructionTargetId[] | null { return normalizeInstructionTargets(fileConfig.instructionTargets); }
export function installAgentsFromConfigFile( fileConfig: { installAgents?: unknown } ): boolean | null { return typeof fileConfig.installAgents === 'boolean' ? fileConfig.installAgents : null; }
export function hasConfiguredInstructionTargets( fileConfig: { instructionTargets?: unknown } ): boolean { return instructionTargetsFromConfigFile(fileConfig) !== null; }
export function hasConfiguredInstallAgents(fileConfig: { installAgents?: unknown }): boolean { return typeof fileConfig.installAgents === 'boolean'; }
export function isInstructionTargetEnabled( targets: InstructionTargetId[], id: InstructionTargetId ): boolean { return targets.includes(id); }
/** Persist no-llm user choices into `.context-graph.json` (merge, keep provider/model). */
export function persistDeterministicPreferences( projectRoot: string, prefs: DeterministicPreferences ): void { /* ~18 lines */ }
/** @deprecated use persistDeterministicPreferences */
export function saveInstructionTargetsToConfig( projectRoot: string, targets: InstructionTargetId[] ): void { persistDeterministicPreferences(pro

```

## Dependencies
**External:**
- ``

## Danger Zone 🔴
- **[fs]** filesystem I/O
