---
description: "Mirror — `.cursor/rules/` (4 files, part 16/20)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `ctxgraph--src-graph-builder-plan-layout.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-plan-parse.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-plan-priority.mdc`
- editing or refactoring `ctxgraph--src-graph-builder-plan-repair.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-graph-builder-plan-layout.mdc` (49 lines · 8 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-plan-parse.mdc` (33 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-plan-priority.mdc` (44 lines · 4 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-graph-builder-plan-repair.mdc` (58 lines · 7 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--src-graph-builder-plan-layout.mdc ──
// ── src/graph-builder/plan/layout.ts ──
export function humanAreaName(segment: string): string { let name = segment .replace(/\.[^.]+$/, '') // strip extension .replace(/^__(.+)__$/, '$1') // __init__ → init .replace(/[-_]+/g, ' ') // delimiters → spaces .trim(); if (!name || …
export function shortHash(s: string): string { return crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 10); }
/** Copilot prompts expect several concrete use cases; pad short auto-generated lists. */
export function padUseCases(cases: string[]): string[] { const out = [...cases]; const pad = 'navigating this subsystem from the instruction index'; while (out.length < 4) out.push(pad); return out.slice(0, 6); }
export function autoInstructionStem(dir: string, files: string[], partIndex: number): string { /* ~12 lines */ }
export function mirrorInstructionSafeSegment(name: string): string { return name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '') || 'x'; }
/** Instruction `.md` path under `.github/instructions/` mirroring source layout. */
export function mirrorInstructionRelPath( dir: string, chunk: string[], partIndex: number, totalParts: number, usedInstructionRelPaths: Set<string> ): string { /* prompt template (~44 lines) */ }
/** Stable instruction path for by-folder grouping (avoids collisions across dirs). */
export function folderInstructionRelPath( dir: string, partIndex: number, totalParts: number, chunk: string[], usedInstructionRelPaths: Set<string> ): string { /* ~23 lines */ }
export function partitionInstructionChunks( list: string[], scan: ScanResult, maxBundle: number ): string[][] { /* ~31 lines */ }

// ── .cursor/rules/ctxgraph--src-graph-builder-plan-parse.mdc ──
// ── src/graph-builder/plan/parse.ts ──
export function parseBuildPlan(raw: string): BuildPlan | null { /* ~16 lines */ }

// ── .cursor/rules/ctxgraph--src-graph-builder-plan-priority.mdc ──
// ── src/graph-builder/plan/priority.ts ──
export type InstructionPriority = 'P0' | 'P1' | 'P2';
/** Higher urgency wins (P0 > P1 > P2). */
export function maxPriority(a: InstructionPriority, b: InstructionPriority): InstructionPriority { return RANK[a] <= RANK[b] ? a : b; }
/**
 * Heuristic priority for a single source file (deterministic / metadata).
 * Aligns with planning prompt: P0 entry & critical paths, P1 frequent, P2 leaf/rare.
 */
export function inferFilePriority( relPath: string, opts?: { /* ~72 lines */ }
/** Subsystem priority = most urgent file in the chunk (mirror bundle or folder group). */
export function inferSubsystemPriority(sourceFiles: string[], scan?: ScanResult): InstructionPriority { /* ~28 lines */ }

// ── .cursor/rules/ctxgraph--src-graph-builder-plan-repair.mdc ──
// ── src/graph-builder/plan/repair.ts ──
export function shouldExcludeFromSubsystems(relPath: string): boolean { const name = path.posix.basename(relPath); return INSTRUCTION_EXCLUDE_RE.some(r => r.test(name) || r.test(relPath)); }
/** Source-code paths the scanner read that merit their own instruction files. */
export function collectScannedSourcePaths(scan: ScanResult): string[] { return scan.files .filter(f => f.tier !== 3 && f.content.length > 0 && !shouldExcludeFromSubsystems(f.path)) .map(f => f.path) .sort(); }
/**
 * After LLM plan + gap-fill, merge subsystems whose source files all live
 * under the same canonical directory into a single instruction file.
 */
export function applyCanonicalGroupings(plan: BuildPlan, repairOpts?: RepairBuildPlanOptions): BuildPlan { /* ~36 lines */ }
export function dedupeSubsystemSourceFiles(plan: BuildPlan): BuildPlan { const seen = new Set<string>(); const subsystems: BuildPlanItem[] = []; for (const s of plan.subsystems) { const sourceFiles = s.sourceFiles.filter(p => { if (seen.…
export function groupPathsIntoAutoSubsystems( paths: string[], scan: ScanResult, usedInstructionRelPaths: Set<string>, repairOpts?: RepairBuildPlanOptions ): BuildPlanItem[] { /* prompt template (~98 lines) */ }
/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairBuildPlan( scan: ScanResult, rawPlan: BuildPlan | null, repairOpts?: RepairBuildPlanOptions ): BuildPlan { /* ~54 lines */ }
/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairOptionsFromConfig(config: Config): RepairBuildPlanOptions { return { subsystemGrouping: config.subsystemGrouping, maxFilesPerFolderSubsystem: config.maxFilesPerFolderSubsystem, subsystemLayout: config.subsystemLayou…

```

## Dependencies
- No dependencies detected
