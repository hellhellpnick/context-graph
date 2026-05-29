---
description: "Mirror — `.cursor/rules/` (4 files, part 17/30)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--src-graph-builder-deterministic-routing-mandate.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-deterministic-subsystem.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-discovery.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-extract-deps-graph.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-graph-builder-deterministic-routing-mandate.mdc` (54 lines · 13 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-deterministic-subsystem.mdc` (47 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-discovery.mdc` (35 lines · 2 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-extract-deps-graph.mdc` (48 lines · 6 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
```

## Signatures

```typescript
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
/** Cursor always-on router rule body (no frontmatter). */
export function buildCursorRouterMandate(): string[] { return [ `## MANDATORY routing (BLOCKING)`, ``, `**MUST** follow attached \`ctxgraph--*\` rule when \`globs\` match the file you edit.`, `If none attached: **MUST** complete path-ind…
/** Windsurf: always_on trigger (docs.windsurf.com — rules in .windsurf/rules/). */
export function buildWindsurfContextGraphRule(): string { const body = [ `# context-graph — Windsurf routing (always on)`, ``, ...buildNamedEntityRoutingMandate(), ...buildRoutingWorkflowSteps(), ...buildToolSpecificRoutingLines('windsur…
/** Cline workspace rule (no standard always-on frontmatter). */
export function buildClineContextGraphRule(): string { return [ `# context-graph — Cline routing`, ``, ...buildRoutingWorkflowSteps(), ...buildToolSpecificRoutingLines('cline'), `## Also load`, ``, `- \`.github/instructions/copilot-instr…
/** Codex supplemental doc (AGENTS.md is primary). */
export function buildCodexContextGraphRule(): string { return [ `# context-graph — Codex supplement`, ``, `**MUST** read \`AGENTS.md\` at repo root first — Codex loads it before every run.`, ``, ...buildRoutingWorkflowSteps(), ...buildTo…
/** Compact matrix for copilot-instructions / human reference. */
export function buildAiToolRoutingReferenceSection(): string[] { /* prompt template (~22 lines) */ }

// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-subsystem.mdc ──
// ── src/graph-builder/deterministic/subsystem.ts ──
export function buildDeterministicSubsystemFile( today: string, instructionPath: string, planItem: BuildPlanItem | undefined, scan: ScanResult, sourceFiles: string[] ): OutputFile { /* prompt template (~300 lines) */ }

// ── .cursor/rules/ctxgraph--src-graph-builder-discovery.mdc ──
// ── src/graph-builder/discovery.ts ──
export function parseSubsystemMappings(generatedFiles: OutputFile[]): SubsystemMapping[] { /* ~28 lines */ }
/** Fallback: extract subsystem paths from markdown links (old format) */
export function findMissingSubsystemPaths(generatedFiles: OutputFile[]): string[] { /* ~16 lines */ }

// ── .cursor/rules/ctxgraph--src-graph-builder-extract-deps-graph.mdc ──
// ── src/graph-builder/extract/deps-graph.ts ──
export const TS_JS_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.go', '.py'];
export function isTsJsLikePath(p: string): boolean { return /\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i.test(p); }
export function stripKnownExt(p: string): string { return p.replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue|go|py)$/i, ''); }
export function extractImportSpecifiersFromTsAst(filePath: string, content: string): string[] { /* ~29 lines */ }
export function resolveInternalImport( fromFile: string, spec: string, existingPaths: Set<string> ): string | null { /* ~30 lines */ }
export function buildDeterministicDependencyGraph( scan: ScanResult, opts?: { /* prompt template (~129 lines) */ }

```

## Dependencies
- No dependencies detected
