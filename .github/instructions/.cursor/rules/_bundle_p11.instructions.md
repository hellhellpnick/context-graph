---
description: "Mirror — `.cursor/rules/` (2 files, part 11/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-bundle-p30.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p31.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p30.mdc` (85 lines · 23 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p31.mdc` (86 lines · 33 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p30.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-plan-repair.mdc ──
// ── src/graph-builder/plan/repair.ts ──
export function shouldExcludeFromSubsystems(relPath: string): boolean { if (isInstructionExcludedPath(relPath)) return true; const name = path.posix.basename(relPath); return INSTRUCTION_EXCLUDE_RE.some(r => r.test(name) || r.test(relPat…
/** Source-code paths the scanner read that merit their own instruction files. */
export function collectScannedSourcePaths(scan: ScanResult): string[] { return scan.files .filter(f => f.tier !== 3 && f.content.length > 0 && !shouldExcludeFromSubsystems(f.path)) .map(f => f.path) .sort(); }
/**
 * After LLM plan + gap-fill, merge subsystems whose source files all live
 * under the same canonical directory into a single instruction file.
 */
export function applyCanonicalGroupings(plan: BuildPlan, repairOpts?: RepairBuildPlanOptions): BuildPlan { /* ~36 lines */ }
export function dedupeSubsystemSourceFiles(plan: BuildPlan): BuildPlan { const seen = new Set<string>(); const subsystems: BuildPlanItem[] = []; for (const s of plan.subsystems) { const sourceFiles = s.sourceFiles.filter(p => { if (seen.…
export function groupPathsIntoAutoSubsystems( paths: string[], scan: ScanResult, usedInstructionRelPaths: Set<string>, repairOpts?: RepairBuildPlanOptions ): BuildPlanItem[] { /* prompt template (~106 lines) */ }
/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairBuildPlan( scan: ScanResult, rawPlan: BuildPlan | null, repairOpts?: RepairBuildPlanOptions ): BuildPlan { /* ~54 lines */ }
/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairOptionsFromConfig(config: Config): RepairBuildPlanOptions { return { subsystemGrouping: config.subsystemGrouping, maxFilesPerFolderSubsystem: config.maxFilesPerFolderSubsystem, subsystemLayout: config.subsystemLayou…
/** Config + scan heuristics (Laravel → by-folder, fewer 1-file-per-controller graphs). */
export function resolveRepairOptions(scan: ScanResult, config: Config): RepairBuildPlanOptions { const base = repairOptionsFromConfig(config); const profile = detectProjectStackProfile(scan); if ( shouldAutoFolderGrouping(scan, profile, …
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

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p31.mdc ──
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

```

## Dependencies
**External:**
- ``

## Danger Zone 🔴
- **[fs]** filesystem I/O
