---
description: "Mirror — `.cursor/rules/` (4 files, part 42/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--src-graph-builder-plan-stack-profile.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-prompt.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-resolve-symbol.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-types.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-graph-builder-plan-stack-profile.mdc` (39 lines · 5 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-prompt.mdc` (43 lines · 4 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-resolve-symbol.mdc` (43 lines · 6 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-types.mdc` (50 lines · 10 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
```

## Signatures

```typescript
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

```

## Dependencies
- No dependencies detected

## Danger Zone 🔴
- **[fs]** filesystem I/O
