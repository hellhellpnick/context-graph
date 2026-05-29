---
description: "Mirror — `.cursor/rules/` (2 files, part 3/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--cursor-rules-bundle-p13.mdc`
- editing or refactoring `ctxgraph--cursor-rules-bundle-p14.mdc`

## Overview
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p13.mdc` (53 lines · 7 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p14.mdc` (90 lines · 18 top-level symbols) — # When to Read

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
