---
description: "Mirror — `.cursor/rules/` (4 files, part 8/16)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-18"
---

## When to Read
- editing or refactoring `ctxgraph--src-graph-builder-deterministic-root.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-deterministic-subsystem.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-discovery.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-extract-deps-graph.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-graph-builder-deterministic-root.mdc` (56 lines · 5 top-level symbols) — # When to Read
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
// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-root.mdc ──
// ── src/graph-builder/deterministic/root.ts ──
export type { CopilotRootOptions }
export function buildDeterministicCopilotInstructions( today: string, scan: ScanResult, plan: BuildPlan, rootOpts?: CopilotRootOptions ): string { /* prompt template (~142 lines) */ }
export function buildDeterministicChangelog(today: string, plan: BuildPlan): string { const lines = [ `# Context Graph — Changelog`, ``, `## ${today} — Initial Build`, ``, `Subsystems created:`, ...plan.subsystems.map(s => `- \`${s.file}…
/** Standard scan-exclusion hints — never infer top-level dirs from nested lockfiles. */
export function buildDeterministicCopilotIgnore(_scan?: ScanResult): string { return [ '# Managed by context-graph — scan exclusions (gitignore syntax; ** = any depth)', '# For project-specific paths use .graph-context-ignore (does not o…
export function injectDeterministicRootFiles( today: string, scan: ScanResult, plan: BuildPlan, files: OutputFile[], llmCopilotContent?: string, rootOpts?: CopilotRootOptions, instructionTargets: I… { /* prompt template (~185 lines) */ }

// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-subsystem.mdc ──
// ── src/graph-builder/deterministic/subsystem.ts ──
export function buildDeterministicSubsystemFile( today: string, instructionPath: string, planItem: BuildPlanItem | undefined, scan: ScanResult, sourceFiles: string[] ): OutputFile { /* prompt template (~284 lines) */ }

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
