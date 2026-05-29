---
description: "Mirror — `.cursor/rules/` (4 files, part 7/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-bundle-p19.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p2.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p20.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p21.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p19.mdc` (77 lines · 13 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p2.mdc` (101 lines · 25 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p20.mdc` (54 lines · 4 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p21.mdc` (50 lines · 4 top-level symbols) — # When to Read

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
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p19.mdc ──
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
export interface RunGraphBuildOpts { strategy: BuildStrategy; effectiveHybridMax: number; quiet: boolean; jsonOutput: boolean; getSpinner: () => Ora | null; setSpinner: (spinner: Ora | null) => void; }
export async function runGraphBuild( scan: ScanResult, config: Config, opts: RunGraphBuildOpts ): Promise<MultiPassResult> { /* ~84 lines */ }

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p2.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p13.mdc ──
// ── .cursor/rules/ctxgraph--src-cli-commands-review.mdc ──
// ── src/cli/commands/review.ts ──
export function registerReviewCommand(program: Command): void { /* ~41 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-validate.mdc ──
// ── src/cli/commands/validate.ts ──
export function registerValidateCommand(program: Command): void { /* ~43 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-io.mdc ──
// ── src/cli/io.ts ──
export interface CliOutputOpts { quiet?: boolean; json?: boolean; }
export function createLoggers(opts: CliOutputOpts) { const quiet = opts.quiet ?? false; const jsonOutput = opts.json ?? false; const log = (...args: unknown[]) => { if (!quiet && !jsonOutput) console.log(...args); }; return { quiet, json…
export function logResolvedProjectRoot( log: (...args: unknown[]) => void, projectRoot: string, opts: CliOutputOpts ) { if (opts.quiet || opts.json) return; const cw = path.resolve(process.cwd()); const pr = path.resolve(projectRoot); if…
export function formatCost(costUSD: number | null, inputTokens: number, outputTokens: number): string { const tokenStr = `${Math.round(inputTokens / 1000)}k in / ${Math.round(outputTokens / 1000)}k out`; if (costUSD === null) return chal…
/** Pre-push hook only: avoid enquirer (Node 20+ can throw ERR_USE_AFTER_CLOSE on confirm). */
export async function promptHookRunActualize(): Promise<boolean> { /* ~24 lines */ }
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p14.mdc ──
// ── .cursor/rules/ctxgraph--src-cli-program.mdc ──
// ── src/cli/program.ts ──
export const program = new Command();
// ── .cursor/rules/ctxgraph--src-cli-version.mdc ──
// ── src/cli/version.ts ──
export const PKG_VERSION: string = (require('../../package.json') as { version: string }).version;
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

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p20.mdc ──
// ── .cursor/rules/ctxgraph--src-cli-commands-actualize.mdc ──
// ── src/cli/commands/actualize.ts ──
export function registerActualizeCommand(program: Command): void { /* ~102 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-agents.mdc ──
// ── src/cli/commands/agents.ts ──
export function registerAgentsCommand(program: Command): void { /* ~77 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-build.mdc ──
// ── src/cli/commands/build.ts ──
export function registerBuildCommand(program: Command): void { /* ~279 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-hook-check.mdc ──
// ── src/cli/commands/hook-check.ts ──
export function registerHookCheckCommand(program: Command): void { /* ~69 lines */ }

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p21.mdc ──
// ── .cursor/rules/ctxgraph--src-cli-commands-impact.mdc ──
// ── src/cli/commands/impact.ts ──
export function registerImpactCommand(program: Command): void { /* ~33 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-resolve.mdc ──
// ── src/cli/commands/resolve.ts ──
export function registerResolveCommand(program: Command): void { /* ~38 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-review.mdc ──
// ── src/cli/commands/review.ts ──
export function registerReviewCommand(program: Command): void { /* ~41 lines */ }
// ── .cursor/rules/ctxgraph--src-cli-commands-validate.mdc ──
// ── src/cli/commands/validate.ts ──
export function registerValidateCommand(program: Command): void { /* ~64 lines */ }

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
- **[fs]** filesystem I/O
