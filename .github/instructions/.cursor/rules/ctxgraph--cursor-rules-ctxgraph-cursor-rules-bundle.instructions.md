---
description: "Mirror — `.cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-bundle.mdc`"
applyTo: ".cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-bundle.mdc"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-ctxgraph-cursor-rules-bundle.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-bundle.mdc` (159 lines · 63 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  ctxgraph__cursor_rules_ctxgraph_cursor_rules_bundle[ctxgraph--cursor-rules-ctxgraph-cursor-rules-bundle]
  ctxgraph__cursor_rules_ctxgraph_cursor_rules_bundle --> node[""]
  ctxgraph__cursor_rules_ctxgraph_cursor_rules_bundle --> package["package"]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-ctxgraph-cursor-rules-bundle.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p10.mdc ──
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
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p11.mdc ──
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
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p12.mdc ──
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
export function buildHowToUseGraphSection( plan: BuildPlan, profile: Proj

```

## Dependencies
**External:**
- ``
- `package`

## Danger Zone 🔴
- **[fs]** filesystem I/O
