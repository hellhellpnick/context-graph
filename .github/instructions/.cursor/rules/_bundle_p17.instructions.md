---
description: "Mirror — `.cursor/rules/` (4 files, part 17/20)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `ctxgraph--src-graph-builder-prompt.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-types.mdc`
- editing or refactoring `ctxgraph--src-graph-builder.mdc`
- editing or refactoring `ctxgraph--src-hooks.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-graph-builder-prompt.mdc` (43 lines · 4 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-types.mdc` (46 lines · 10 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder.mdc` (38 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-hooks.mdc` (39 lines · 4 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--src-graph-builder-prompt.mdc ──
// ── src/graph-builder/prompt.ts ──
/** Node / Python / Rust / PHP env access heuristics for Danger Zone + mermaid. */
export function fileReadsEnvironment(content: string): boolean { return /process\.env|os\.environ|os\.getenv\s*\(|std::env|getenv\s*\(|(?:^|[^\w$.])env\s*\(\s*['"][^'"]+['"]|(?:^|[^\w$])\$_ENV(?:\[|\b)|(?:^|[^\w$])\$_SERVER\s*\[/i.test( …
export function styleDirective(config: Config, target: 'notes' | 'root' | 'subsystem'): string { /* prompt template (~17 lines) */ }
export function loadSystemPrompt(): string { const candidates = [ path.join(__dirname, '../../prompts/graph-create-agent.md'), path.join(__dirname, '../../../graph-create-agent.md'), path.join(process.cwd(), 'graph-create-agent.md'), ]; …
export function loadExistingGraph(graphDir: string): string { const rootFile = path.join(graphDir, 'copilot-instructions.md'); if (!fs.existsSync(rootFile)) return ''; return fs.readFileSync(rootFile, 'utf8'); }

// ── .cursor/rules/ctxgraph--src-graph-builder-types.mdc ──
// ── src/graph-builder/types.ts ──
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

```

## Dependencies
**External:**
- ``

## Danger Zone 🔴
- **[fs]** filesystem I/O
