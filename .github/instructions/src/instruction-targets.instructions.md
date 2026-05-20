---
description: "Mirror — `src/instruction-targets.ts`"
applyTo: "src/instruction-targets.ts"
priority: "P2"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `instruction-targets.ts`

## Overview
- `src/instruction-targets.ts` (385 lines · 23 top-level symbols) — Mirror — `src/instruction-targets.ts`

## Graph
```mermaid
graph LR
  instruction_targets[instruction-targets]
```

## Signatures

```typescript
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
export function saveInstructionTargetsToConfig( projectRoot: string, targets: InstructionTargetId[] ): void { persistDeterministicPreferences(projectRoot, { instructionTargets: targets, installAgents: false, }); }
export function needsInstructionTargetSetup(fileConfig: ConfigFileSlice): boolean { if (parseInstructionTargetsEnv(process.env.CONTEXT_GRAPH_INSTRUCTION_TARGETS)) return false; return !hasConfiguredInstructionTargets(fileConfig); }
export function needsInstallAgentsSetup(fileConfig: ConfigFileSlice): boolean { if (parseInstallAgentsEnv(process.env.CONTEXT_GRAPH_INSTALL_AGENTS) !== null) return false; return !hasConfiguredInstallAgents(fileConfig); }
export function needsDeterministicPreferencesSetup(fileConfig: ConfigFileSlice): boolean { return needsInstructionTargetSetup(fileConfig) || needsInstallAgentsSetup(fileConfig); }
/** Ask which AI adapters to generate (does not write config — caller persists). */
export async function promptInstructionTargetsInteractive(opts?: { /* ~73 lines */ }
/** Ask whether to fetch agency-agents into `.github/agents/` (does not write config). */
export async function promptInstallAgentsInteractive(): Promise<boolean> { /* ~31 lines */ }
export async function resolveInstructionTargets(opts: { /* ~17 lines */ }
export function resolveInstallAgents(fileConfig: ConfigFileSlice): boolean { const fromEnv = parseInstallAgentsEnv(process.env.CONTEXT_GRAPH_INSTALL_AGENTS); if (fromEnv !== null) return fromEnv; const fromFile = installAgentsFromConfigF…
/**
 * no-llm first-time / incomplete config: prompt for targets + agents, persist once.
 */
export async function ensureDeterministicSetup(opts: { /* ~74 lines */ }

```

## Dependencies
- No dependencies detected

## Danger Zone 🔴
- **[env]** reads `process.env.CONTEXT_GRAPH_INSTRUCTION_TARGETS`
- **[env]** reads `process.env.CONTEXT_GRAPH_INSTALL_AGENTS`
- **[fs]** filesystem I/O
