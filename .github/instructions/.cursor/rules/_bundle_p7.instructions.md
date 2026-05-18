---
description: "Mirror — `.cursor/rules/` (4 files, part 7/16)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-18"
---

## When to Read
- editing or refactoring `ctxgraph--src-graph-builder-deterministic-cursor-rules.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-deterministic-metadata.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-deterministic-root-project.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-deterministic-root-slim.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-graph-builder-deterministic-cursor-rules.mdc` (47 lines · 5 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-deterministic-metadata.mdc` (42 lines · 4 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-deterministic-root-project.mdc` (45 lines · 6 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-deterministic-root-slim.mdc` (48 lines · 7 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
```

## Signatures

```typescript
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
export function buildIndexMd(today: string, plan?: BuildPlan): string { /* prompt template (~42 lines) */ }

// ── .cursor/rules/ctxgraph--src-graph-builder-deterministic-root-project.mdc ──
// ── src/graph-builder/deterministic/root-project.ts ──
export function buildHowToUseGraphSection( plan: BuildPlan, profile: ProjectStackProfile ): string[] { /* prompt template (~25 lines) */ }
export function buildCodeZonesSection(plan: BuildPlan, profile: ProjectStackProfile): string[] { /* prompt template (~53 lines) */ }
export function buildProjectDataFlowSection( scan: ScanResult, profile: ProjectStackProfile ): string[] { /* prompt template (~62 lines) */ }
export interface NavZonePick { zone: string; subsystem: BuildPlanItem; }
/** Zone-aware highlights for slim root (Laravel API first, not random P0 Vue). */
export function pickZoneNavigationHighlights( plan: BuildPlan, profile: ProjectStackProfile, maxTotal: number ): string[] { /* prompt template (~63 lines) */ }
export function getProjectStackProfile(scan: ScanResult): ProjectStackProfile { return detectProjectStackProfile(scan); }

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

```

## Dependencies
- No dependencies detected
