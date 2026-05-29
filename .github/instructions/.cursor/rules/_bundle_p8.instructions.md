---
description: "Mirror — `.cursor/rules/` (4 files, part 8/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-bundle-p22.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p23.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p24.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p25.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p22.mdc` (55 lines · 7 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p23.mdc` (139 lines · 45 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p24.mdc` (71 lines · 16 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p25.mdc` (96 lines · 33 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
  Rules --> package["package"]
  Rules --> ENV{{"env / config"}}
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p22.mdc ──
// ── .cursor/rules/ctxgraph--src-cli-io.mdc ──
// ── src/cli/io.ts ──
export interface CliOutputOpts { quiet?: boolean; json?: boolean; }
export function createLoggers(opts: CliOutputOpts) { const quiet = opts.quiet ?? false; const jsonOutput = opts.json ?? false; const log = (...args: unknown[]) => { if (!quiet && !jsonOutput) console.log(...args); }; return { quiet, json…
export function logResolvedProjectRoot( log: (...args: unknown[]) => void, projectRoot: string, opts: CliOutputOpts ) { if (opts.quiet || opts.json) return; const cw = path.resolve(process.cwd()); const pr = path.resolve(projectRoot); if…
export function formatCost(costUSD: number | null, inputTokens: number, outputTokens: number): string { const tokenStr = `${Math.round(inputTokens / 1000)}k in / ${Math.round(outputTokens / 1000)}k out`; if (costUSD === null) return chal…
/** Pre-push hook only: avoid enquirer (Node 20+ can throw ERR_USE_AFTER_CLOSE on confirm). */
export async function promptHookRunActualize(): Promise<boolean> { /* ~24 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-program.mdc ──
// ── src/cli/program.ts ──
export const program = new Command();
// ── .cursor/rules/ctxgraph--src-cli-version.mdc ──
// ── src/cli/version.ts ──
export const PKG_VERSION: string = (require('../../package.json') as { version: string }).version;

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p23.mdc ──
// ── .cursor/rules/ctxgraph--src-config.mdc ──
// ── src/config.ts ──
export type { InstructionTargetId } from './instruction-targets'
export { INSTRUCTION_TARGET_IDS, INSTRUCTION_TARGET_LABELS, hasConfiguredInstructionTargets, hasConfiguredInstallAgents, needsInstructionTargetSetup, needsInstallAgentsSetup, needsDeterministicPreferencesSetup, normalizeInstructionTarget…
export { projectGraphExists } from './project-graph'
/** `slim` = smaller prompts for local LLMs (truncated bodies + shorter root pass). */
export type ContextDepth = 'full' | 'slim';
export type BuildStrategy = 'llm' | 'hybrid' | 'deterministic';
export type OutputStyle = 'normal' | 'compact';
/** How gap-filled / deterministic subsystems group source files (see repairBuildPlan). */
export type SubsystemGrouping = 'default' | 'by-folder';
/** Where instruction files live under `.github/instructions/`: mirror repo paths vs legacy core/infra. */
export type SubsystemLayout = 'mirror' | 'canonical';
export interface Config { /* prompt template (~29 lines) */ }
export const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = { /* ~24 lines */ }
export function getModelMaxTokens(model: string): number { // Exact match first, then prefix match (e.g. 'gpt-4o-2024-11-20' → 'gpt-4o') if (MODEL_MAX_OUTPUT_TOKENS[model]) return MODEL_MAX_OUTPUT_TOKENS[model]; for (const key of Object.…
/** Ollama does not use a real API key (see `openai.ts` placeholder). */
export function providerAllowsMissingApiKey(provider: ProviderConfig['provider']): boolean { return provider === 'ollama'; }
export function loadConfig(projectRoot: string): Config { /* ~130 lines */ }
/** Raw `.context-graph.json` object (for target prompt / merge writes). */
export function readConfigFile(projectRoot: string): ConfigFile { const configPath = path.join(projectRoot, '.context-graph.json'); if (!fs.existsSync(configPath)) return {}; try { return JSON.parse(fs.readFileSync(configPath, 'utf8')) a…
export function initConfig( projectRoot: string, providerName?: string, model?: string ): boolean { /* ~24 lines */ }
export async function initConfigInteractive(projectRoot: string): Promise<boolean> { /* ~56 lines */ }
// ── .cursor/rules/ctxgraph--src-framework-extract.mdc ──
// ── src/framework-extract.ts ──
export { extractCSharpSymbolLines } from './source-extract'
export type FrameworkId = | 'nuxt' | 'vue' | 'react' | 'next' | 'angular' | 'python' | 'php' | 'csharp' | 'rust' | 'java' | 'kotlin' | 'ruby';
/** Detect stacks present in a file (path + content). */
export function detectFrameworks(relPath: string, content: string): FrameworkId[] { /* ~44 lines */ }
export function extractRuntimeSection( relPath: string, content: string ): { /* ~49 lines */ }
export function extractDeterministicErrorsForFile( relPath: string, content: string, fileLabel?: string ): string[] { /* ~29 lines */ }
export function extractSideEffectsForFile(relPath: string, content: string): string[] { /* ~26 lines */ }
/** Extra split-score boosts per detected stack. */
export function frameworkSplitScoreBoost(relPath: string, content: string): number { /* ~45 lines */ }
/** Import buckets for Dependencies section. */
export function classifyFrameworkImports(deps: string[]): { /* ~25 lines */ }
/** Split score including all framework heuristics. */
export function instructionSplitScoreFull(relPath: string, content: string, lines?: number): number { return instructionSplitScore(relPath, content, lines) + frameworkSplitScoreBoost(relPath, content); }
export function needsOwnInstructionFile(relPath: string, content: string, lines?: number): boolean { const norm = relPath.replace(/\\/g, '/'); const top = norm.split('/')[0]; if (['src', 'lib', 'app', 'cmd', 'internal'].includes(top)) re…
// ── .cursor/rules/ctxgraph--src-graph-builder-constants.mdc ──
// ── src/graph-builder/constants.ts ──
/** Shared constants for graph-builder. */
export const OUTPUT_FORMAT_INSTRUCTION = ` --- ## MANDATORY OUTPUT FORMAT You MUST wrap every output file in these exact delimiters. No prose outside the blocks. <<<FILE: path/relative/to/project/r… { /* prompt template (~23 lines) */ }
/** Per-file instruction split for TS/Go-style trees — not Laravel `app/` (use by-folder there). */
export const SPLIT_DIRS = new Set(['src', 'lib', 'cmd', 'internal']);
export const MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_DEFAULT = 4;
/** Default cap for `by-folder` grouping when config does not override. */
export const MAX_FILES_PER_FOLDER_SUBSYSTEM_DEFAULT = 48;
/** Auto slim `copilot-instructions.md` when plan has at least this many subsystems. */
export const ROOT_SLIM_AUTO_SUBSYSTEM_THRESHOLD = 40;
/** Auto slim when total mapped source files exceed this (e.g. Laravel `app/` one-file-per-subsystem). */
export const ROOT_SLIM_AUTO_SOURCE_FILES_THRESHOLD = 80;
/** Max tier-1 paths listed in root Data Flow (non-slim included). */
export const ROOT_DATA_FLOW_ENTRY_CAP = 12;
/** Max Quick Navigation entries in slim root (plus path-index pointer). */
export const ROOT_SLIM_QUICK_NAV_CAP = 40;
/** Max directory groups in slim Architecture Overview. */
export const ROOT_SLIM_ARCH_GROUP_CAP = 28;
/** Max mermaid nodes in slim root dependency graph. */
export const ROOT_SLIM_DEP_GRAPH_MAX_NODES = 48;
/** Max env/danger file bullets in slim root. */
export const ROOT_SLIM_DANGER_CAP = 24;
/** Max per-file PHP routing blocks in one folder bundle instruction. */
export const PHP_BUNDLE_ROUTING_FILE_CAP = 36;
/** Extra one-line PHP index rows after cap. */
export const PHP_BUNDLE_INDEX_TAIL = 16;
/**
 * Files that should NOT get their own instruction subsystem.
 * Documentation, non-code configs, lock-files, images, etc.
 * They are still present in the scan (for metadata.json / tree) but excluded from subsystem passes.
 */
export const INSTRUCTION_EXCLUDE_RE = [ /^README(\..+)?$/i, /^EXAMPLES(\..+)?$/i, /^CONTRIBUTING(\..+)?$/i, /^CHANGELOG(\..+)?$/i, /^LICENSE(\..+)?$/i, /^CODE_OF_CONDUCT(\..+)?$/i, /^\.gitignore$/,… { /* ~44 lines */ }
export const DIR_TO_INSTRUCTION_PREFIX: Record<string, string> = { src: 'core', lib: 'core', app: 'core', internal: 'core', cmd: 'core', 'src/providers': 'infra', python: 'python', scripts: 'infra', '.github': 'infra', };
export const MAX_MIRROR_INSTRUCTION_REL_LEN = 200;
export const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|py|go|rs|java|kt|cs|rb|php)$/i;
/** Baseline .copilotignore patterns (gitignore syntax; ** matches any depth). */
export const COPILOTIGNORE_BASELINE: readonly string[] = [ '**/node_modules/', '**/dist/', '**/build/', '**/coverage/', '**/.nyc_output/', '**/__pycache__/', '**/.venv/', '**/venv/', '**/.git/', '**/vendor/', '**/.next/', '**/.nuxt/', '*…
export const PRICING: Record<string, { /* ~16 lines */ }

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p24.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-cost.mdc ──
// ── src/graph-builder/cost.ts ──
export function estimateCost(model: string, usage: LLMUsage): number | null { const pricing = PRICING[model]; if (!pricing) { const key = Object.keys(PRICING).find(k => model.startsWith(k)); if (!key) return null; const p = PRICING[key];…
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-cursor-rules.mdc ──
// ── src/graph-builder/deterministic/cursor-rules.ts ──
/** Strip YAML frontmatter from subsystem instruction markdown. */
export function stripInstructionFrontmatter(md: string): string { if (!md.startsWith('---')) return md.trim(); const end = md.indexOf('\n---', 3); if (end === -1) return md.trim(); const after = md.indexOf('\n', end + 4); return (after =…
/** `applyTo` from plan → Cursor `globs` string (comma-separated). */
export function applyToToCursorGlobs(applyTo: string): string { const parts = applyTo .split(',') .map(s => s.trim()) .filter(Boolean); if (parts.length === 0) return '**/*'; return parts .map(p => p.replace(/\\/g, '/')) .join(', '); }
export function slugFromInstructionFile(instructionRel: string): string { const base = instructionRel.replace(/\.instructions\.md$/i, ''); const slug = base.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, ''); const name = `${RULE_PRE…
export function buildCursorRuleMdc( planItem: BuildPlanItem, instructionRelPath: string, instructionBody: string ): string { /* prompt template (~24 lines) */ }
/**
 * Emit one \`.cursor/rules/ctxgraph--<slug>.mdc\` per subsystem so Cursor auto-loads
 * instructions without asking the model to open files manually.
 */
export function appendCursorRuleFiles( plan: BuildPlan, files: OutputFile[], instructionTargets: InstructionTargetId[] = [] ): void { /* prompt template (~48 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-metadata.mdc ──
// ── src/graph-builder/deterministic/metadata.ts ──
export interface MetadataProjectSettings { buildStrategy?: string; instructionTargets?: string[]; installAgents?: boolean; }
export function buildMetadataJson( today: string, scan: ScanResult, plan?: BuildPlan, projectSettings?: MetadataProjectSettings ): string { /* ~58 lines */ }
/** Flat table: every instruction path ↔ applyTo ↔ sources (for LLMs and search). */
export function buildContextGraphPathIndexMd(today: string, plan: BuildPlan): string { /* prompt template (~20 lines) */ }
/** Build index.md content from plan subsystems — no LLM guessing */
export function buildIndexMd(today: string, plan?: BuildPlan): string { /* prompt template (~43 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-root-project.mdc ──
// ── src/graph-builder/deterministic/root-project.ts ──
export function buildHowToUseGraphSection( plan: BuildPlan, profile: ProjectStackProfile ): string[] { /* prompt template (~28 lines) */ }
export function buildCodeZonesSection(plan: BuildPlan, profile: ProjectStackProfile): string[] { /* prompt template (~53 lines) */ }
export function buildProjectDataFlowSection( scan: ScanResult, profile: ProjectStackProfile ): string[] { /* prompt template (~62 lines) */ }
export interface NavZonePick { zone: string; subsystem: BuildPlanItem; }
/** Zone-aware highlights for slim root (Laravel API first, not random P0 Vue). */
export function pickZoneNavigationHighlights( plan: BuildPlan, profile: ProjectStackProfile, maxTotal: number ): string[] { /* prompt template (~63 lines) */ }
export function getProjectStackProfile(scan: ScanResult): ProjectStackProfile { return detectProjectStackProfile(scan); }

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p25.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-root-slim.mdc ──
// ── src/graph-builder/deterministic/root-slim.ts ──
export interface CopilotRootOptions { /** Force slim root (e.g. `contextDepth: slim`). Auto when subsystems ≥ threshold. */ slimRoot?: boolean; }
export function resolveRootSlimMode(plan: BuildPlan, opts?: CopilotRootOptions): boolean { if (opts?.slimRoot === true) return true; if (opts?.slimRoot === false) return false; if (plan.subsystems.length >= ROOT_SLIM_AUTO_SUBSYSTEM_THRES…
/** Directory key for grouping (up to 3 segments under repo root). */
export function sourceDirGroupKey(sourcePath: string): string { const norm = sourcePath.replace(/\\/g, '/'); if (!norm.includes('/')) return '.'; const parts = path.posix.dirname(norm).split('/').filter(Boolean); const depth = parts[0] =…
export interface DirGroupSummary { dir: string; subsystemCount: number; sourceFileCount: number; bestPriority: BuildPlanItem['priority']; }
export function summarizeSubsystemDirGroups(plan: BuildPlan): DirGroupSummary[] { /* ~26 lines */ }
export function buildQuickNavigationLines( plan: BuildPlan, slim: boolean, scan?: ScanResult ): string[] { /* prompt template (~92 lines) */ }
export function buildSlimArchitectureOverviewLines(plan: BuildPlan): string[] { /* prompt template (~24 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-root.mdc ──
// ── src/graph-builder/deterministic/root.ts ──
export type { CopilotRootOptions }
export function buildDeterministicCopilotInstructions( today: string, scan: ScanResult, plan: BuildPlan, rootOpts?: CopilotRootOptions ): string { /* prompt template (~142 lines) */ }
export function buildDeterministicChangelog(today: string, plan: BuildPlan): string { const lines = [ `# Context Graph — Changelog`, ``, `## ${today} — Initial Build`, ``, `Subsystems created:`, ...plan.subsystems.map(s => `- \`${s.file}…
/** Standard scan-exclusion hints — never infer top-level dirs from nested lockfiles. */
export function buildDeterministicCopilotIgnore(_scan?: ScanResult): string { return [ '# Managed by context-graph — scan exclusions (gitignore syntax; ** = any depth)', '# For project-specific paths use .graph-context-ignore (does not o…
export function injectDeterministicRootFiles( today: string, scan: ScanResult, plan: BuildPlan, files: OutputFile[], llmCopilotContent?: string, rootOpts?: CopilotRootOptions, instructionTargets: I… { /* prompt template (~160 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-routing-entrypoints.mdc ──
// ── src/graph-builder/deterministic/routing-entrypoints.ts ──
/** Minimum markers every full routing entry file must contain. */
export const ROUTING_MANDATE_MARKERS = [ ROUTING_MANDATE_HEADING, 'symbol-index', 'FORBIDDEN', ] as const;
/** Paths checked when the corresponding instruction target is enabled. */
export const ROUTING_ENTRYPOINTS_BY_TARGET: Record<InstructionTargetId, readonly string[]> = { copilot: ['.github/copilot-instructions.md'], cursor: ['.cursor/rules/context-graph.mdc'], claude: ['CLAUDE.md'], agents: [], gemini: ['GEMINI…
/** Always emitted with the instruction graph (any agent should read). */
export const ROUTING_CORE_ENTRYPOINTS = [ '.github/instructions/copilot-instructions.md', 'AGENTS.md', ] as const;
export interface RoutingEntrypointIssue { relPath: string; kind: 'missing' | 'weak'; detail?: string; }
export function routingContentHasMandate(content: string): boolean { return ROUTING_MANDATE_MARKERS.every(m => content.includes(m)); }
export function collectExpectedRoutingEntrypoints( instructionTargets: InstructionTargetId[] ): string[] { const out = new Set<string>(ROUTING_CORE_ENTRYPOINTS); const targets = instructionTargets.length > 0 ? instructionTargets : (Objec…
export function auditRoutingEntrypoints( projectRoot: string, instructionTargets: InstructionTargetId[] ): RoutingEntrypointIssue[] { /* ~22 lines */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-routing-mandate.mdc ──
// ── src/graph-builder/deterministic/routing-mandate.ts ──
/** Imperative routing copy (MUST / BLOCKING) — no "when", "should", "prefer". */
export const ROUTING_MANDATE_HEADING = '## MANDATORY — read instructions first (BLOCKING)';
/** When user names a component/file in chat (LinkTag, useSeo) — no file open. */
export function buildNamedEntityRoutingMandate(): string[] { /* prompt template (~16 lines) */ }
/** Shared 5-step BLOCKING workflow. */
export function buildRoutingWorkflowSteps(examplePath?: string): string[] { /* prompt template (~18 lines) */ }
/** After "## How to use this graph" in copilot-instructions.md */
export function buildCopilotGraphMandate(examplePath: string): string[] { return [ ROUTING_MANDATE_HEADING, ``, ...buildNamedEntityRoutingMandate(), ...buildRoutingWorkflowSteps(examplePath), `**GitHub Copilot (VS Code / JetBrains / Copi…
/** Top of CLAUDE.md / AGENTS.md / GEMINI.md — immediately after title. */
export function buildAgentEntryMandate(): string[] { return [ ROUTING_MANDATE_HEADING, ``, ...buildNamedEntityRoutingMandate(), ...buildRoutingWorkflowSteps(), ]; }
export type AgentEntryTool = | 'claude' | 'agents' | 'gemini' | 'codex' | 'windsurf' | 'cline' | 'copilot';
/** Tool-specific lines after shared mandate (docs-backed, May 2026). */
export function buildToolSpecificRoutingLines(tool: AgentEntryTool): string[] { /* prompt template (~71 lines) */ }
export function buildAgentEntryWithTool(title: string, tool: AgentEntryTool): string[] { return [ `# ${title}`, ``, ...buildAgentEntryMandate(), ...buildToolSpecificRoutingLines(tool), ]; }
/** Short router blurb (legacy / embedded refs). */
export function buildCursorRouterMandate(): string[] { return [ `## MANDATORY routing (BLOCKING)`, ``, `**MUST** follow attached \`ctxgraph--*\` rule when \`globs\` match the file you edit.`, `If none attached: **MUST** complete path-ind…
/** Cursor \`context-graph.mdc\` body — full BLOCKING mandate (alwaysApply: true). */
export function buildCursorAlwaysOnRuleBody(): string { /* prompt template (~21 lines) */ }
/** Windsurf: always_on trigger (docs.windsurf.com — rules in .windsurf/rules/). */
export function buildWindsurfContextGraphRule(): string { const body = [ `# context-graph — Windsurf routing (always on)`, ``, ...buildNamedEntityRoutingMandate(), ...buildRoutingWorkflowSteps(), ...buildToolSpecificRoutingLines('windsur…
/** Cline workspace rule (no standard always-on frontmatter). */
export function buildClineContextGraphRule(): string { return [ `# context-graph — Cline routing`, ``, ...buildNamedEntityRoutingMandate(), ...buildRoutingWorkflowSteps(), ...buildToolSpecificRoutingLines('cline'), `## Also load`, ``, `-…
/** Codex supplemental doc (AGENTS.md is primary). */
export function buildCodexContextGraphRule(): string { return [ `# context-graph — Codex supplement`, ``, `**MUST** read \`AGENTS.md\` at repo root first — Codex loads it before every run.`, ``, ...buildNamedEntityRoutingMandate(), ...bu…
/** Compact matrix for copilot-instructions / human reference. */
export function buildAiToolRoutingReferenceSection(): string[] { /* prompt template (~22 lines) */ }

```

## Dependencies
**External:**
- ``
- `package`

## Danger Zone 🔴
- **[env]** reads `process.env.CONTEXT_GRAPH_PROVIDER`
- **[env]** reads `process.env.CONTEXT_GRAPH_BASE_URL`
- **[env]** reads `process.env.CONTEXT_GRAPH_CONTEXT_DEPTH`
- **[env]** reads `process.env.CONTEXT_GRAPH_BUILD_STRATEGY`
- **[env]** reads `process.env.CONTEXT_GRAPH_HYBRID_MAX_SUBSYSTEMS`
- **[env]** reads `process.env.CONTEXT_GRAPH_HYBRID_NOTES_MODE`
- **[env]** reads `process.env.CONTEXT_GRAPH_OUTPUT_STYLE`
- **[env]** reads `process.env.CONTEXT_GRAPH_SUBSYSTEM_GROUPING`
- **[env]** reads `process.env.CONTEXT_GRAPH_MAX_FILES_PER_FOLDER_SUBSYSTEM`
- **[env]** reads `process.env.CONTEXT_GRAPH_SUBSYSTEM_LAYOUT`
- **[env]** reads `process.env.CONTEXT_GRAPH_INSTRUCTION_TARGETS`
- **[env]** reads `process.env.CONTEXT_GRAPH_INSTALL_AGENTS`
- **[env]** reads `process.env.CONTEXT_GRAPH_MODEL`
- **[env]** reads `process.env.CONTEXT_GRAPH_MAX_OUTPUT_TOKENS`
- **[env]** reads `process.env.CONTEXT_GRAPH_MAX_FILES`
- **[env]** reads `process.env.CONTEXT_GRAPH_MAX_INPUT_TOKENS`
- **[env]** getenv('${m[1]}')
- **[env]** env('${m[1]}')
- **[fs]** filesystem I/O
