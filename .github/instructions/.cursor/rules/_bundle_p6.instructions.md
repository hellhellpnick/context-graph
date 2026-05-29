---
description: "Mirror — `.cursor/rules/` (4 files, part 6/39)"
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
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p19.mdc` (62 lines · 14 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p2.mdc` (144 lines · 55 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p20.mdc` (71 lines · 20 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--cursor-rules-bundle-p21.mdc` (87 lines · 21 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p19.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-llm-notes.mdc ──
// ── src/graph-builder/llm/notes.ts ──
export function insertNotesSection(md: string, notes: string, afterHeading: string): string { /* ~14 lines */ }
export function buildNotesPrompt( config: Config, kind: 'root' | 'subsystem', title: string, exportsBlock: string, snippet: string ): string { /* prompt template (~32 lines) */ }
export function buildSnippetForFiles(scan: ScanResult, sourceFiles: string[], maxChars: number): string { /* prompt template (~101 lines) */ }
export function insertExportNotesUnderSignatures(md: string, notes: string): string { if (!notes.trim()) return md; const clean = notes.trim().replace(/\r\n/g, '\n'); const section = `### Notes (LLM)\n\n${clean}\n`; return insertAfterHea…
export function extractExportNamesForNotes(scan: ScanResult, sourceFiles: string[]): string[] { /* ~114 lines */ }
export function buildExportNotesPrompt(config: Config, title: string, exportNames: string[], snippet: string): string { /* prompt template (~23 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-llm-validate.mdc ──
// ── src/graph-builder/llm/validate.ts ──
export function mergeLlmProse(skeleton: string, llmContent: string): string { /* ~26 lines */ }
export function insertAfterHeading(md: string, heading: string, insert: string): string { const re = new RegExp(`^## ${heading}\\b[^\\n]*\\n`, 'm'); const m = re.exec(md); if (!m) return md + '\n\n' + insert; const insertAt = m.index + m…
export function subsystemOutputLooksOk(files: OutputFile[], instructionPath: string): boolean { const norm = instructionPath.replace(/\\/g, '/'); const base = path.posix.basename(norm); return files.some(f => { const fp = f.path.replace(…
/** Sanitize mermaid code blocks: strip lines with common LLM syntax errors. */
export function sanitizeMermaidBlocks(content: string): string { /* ~22 lines */ }
export function llmContentMatchesRealExports( llmContent: string, scan: ScanResult, sourceFiles: string[] ): boolean { /* ~77 lines */ }
/** Second-chance prompt when local models skip <<<EOF>>> or add prose. */
export function buildSubsystemRepairMessage(today: string, instructionPath: string, planItem?: BuildPlanItem): string { /* prompt template (~33 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-messages-planning.mdc ──
// ── src/graph-builder/messages/planning.ts ──
export function buildPlanningPassMessage(scan: ScanResult): string { /* prompt template (~65 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-messages-root.mdc ──
// ── src/graph-builder/messages/root.ts ──
export function buildRootPassMessage( today: string, scanPrompt: ScanResult, plan: BuildPlan | undefined, scanFull: ScanResult, opts?: { /* prompt template (~116 lines) */ }

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p2.mdc ──
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p13.mdc ──
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
export function injectDeterministicRootFiles( today: string, scan: ScanResult, plan: BuildPlan, files: OutputFile[], llmCopilotContent?: string, rootOpts?: CopilotRootOptions, instructionTargets: I… { /* prompt template (~190 lines) */ }
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
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p14.mdc ──
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
// ── .cursor/rules/ctxgraph--src-graph-builder-extract-exports.mdc ──
// ── src/graph-builder/extract/exports.ts ──
/** JSDoc attached to a declaration (leading trivia via TS API). */
export function formatAttachedJSDocBlocks(sf: ts.SourceFile, node: ts.Node): string[] { /* ~16 lines */ }
/**
 * Extract exports with surrounding context: JSDoc comments above the export,
 * and the first meaningful line of the body (to hint at return type / purpose).
 */
export function extractExports(scan: ScanResult, sourceFiles: string[]): string { /* prompt template (~242 lines) */ }
export const DETERMINISTIC_SOURCE_MAX_LINES = 80;
export const DETERMINISTIC_SOURCE_SKELETON_MAX_LINES = 48;
/** Full ## Source only when signatures are thin or UI/runtime needs script body. */
export function shouldIncludeDeterministicSource( scan: ScanResult, sourceFiles: string[], exportBlock: string ): boolean { /* ~21 lines */ }
export function buildDeterministicSourceSection(scan: ScanResult, sourceFiles: string[]): string[] { /* prompt template (~67 lines) */ }
/** Mermaid nodes for Vue SFCs: props, computeds, resolve branches. */
export function buildVueMermaidNodes( filePath: string, content: string, externalNodeIds: Set<string> ): string[] { /* prompt template (~35 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-extract-imports.mdc ──
// ── src/graph-builder/extract/imports.ts ──
export function extractImports(scan: ScanResult, sourceFiles: string[]): string[] { /* ~103 lines */ }
/** Check if a file is a barrel (re-exports only, no own logic). */
export function isBarrelFile(content: string): boolean { const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')); if (lines.length === 0) return false; const reExportLines = lines.filter(l => /^export\s+(\{.…
// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p15.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-extract-misc.mdc ──
// ── src/graph-builder/extract/misc.ts ──
export function extractCliCommands(content: string): string[] { const commands: string[] = []; const lines = content.split('\n'); for (const line of lines) { // Commander: .command('build [dir]') const m = line.match(/\.command\(\s*['"](…
/** `export * from` / `export { } from` targets (barrel files). */
export function extractReExportTargets(content: string): string[] { const out: string[] = []; for (const line of content.split('\n')) { const t = line.trim(); const star = t.match(/^export\s+\*\s+from\s+['"]([^'"]+)['"]/); if (star) out.…
/** Reject auto-extracted purpose lines that are code hints, not file intent. */
export function isWeakFilePurpose(purpose: string): boolean { const t = purpose.trim(); if (t.length < 12) return true; return PURPOSE_COMMENT_SKIP.test(t); }
/** Lines before first top-level declaration (file banner only). */
export function fileHeaderSlice(content: string): string { const lines = content.split('\n'); const header: string[] = []; for (const line of lines) { const t = line.trim(); if (!t) { header.push(line); continue; } if ( /^(export\s|impor…
/** One-line purpose summary: JSDoc / file-level `//` / `#` (PHP) — not in-function comments. */
export function extractFilePurpose(content: string): string | null { /* ~45 lines */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-index.mdc ──
// ── src/graph-builder/index.ts ──
/**
 * Graph builder — modular layout (was monolithic graph-builder.ts).
 */
export * from './types'
export { /* prompt template (~1 lines) */ }
export { loadSystemPrompt, loadExistingGraph, styleDirective, fileReadsEnvironment } from './prompt'
export { extractExports, buildDeterministicSourceSection, shouldIncludeDeterministicSource, buildVueMermaidNodes, } from './extract/exports'
export { extractImports } from './extract/imports'
export { buildDeterministicDependencyGraph } from './extract/deps-graph'
export { extractCliCommands, extrac

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p20.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-messages-subsystem.mdc ──
// ── src/graph-builder/messages/subsystem.ts ──
export function buildFocusedContext(scan: ScanResult, sourceFiles: string[], subsystemName: string): string { /* ~21 lines */ }
export function buildSubsystemPassMessage( today: string, subsystemPath: string, rootGraphContent: string, scanPrompt: ScanResult, scanFull: ScanResult, sourceFiles: string[], planItem?: BuildPlanI… { /* prompt template (~96 lines) */ }
export function buildUserMessage(mode: BuildMode, scan: ScanResult, opts: BuildOptions): string { /* prompt template (~37 lines) */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-plan-infer.mdc ──
// ── src/graph-builder/plan/infer.ts ──
export function buildPlanningContextLight(scan: ScanResult): string { /* ~29 lines */ }
export function readPackageJsonAt( scan: ScanResult, relPath: string ): Record<string, unknown> | null { const f = scan.files.find(x => x.path === relPath && x.content); if (!f) return null; try { return JSON.parse(f.content) as Record<s…
export function readPackageJson(scan: ScanResult): Record<string, unknown> | null { return readPackageJsonAt(scan, resolvePrimaryPackagePath(scan)); }
export function readGoModModule(scan: ScanResult): string | null { const f = scan.files.find(x => x.path === 'go.mod' && x.content); if (!f) return null; const m = f.content.match(/^module\s+(\S+)/m); return m ? m[1].trim() : null; }
export function readComposerJson(scan: ScanResult): Record<string, unknown> | null { const f = scan.files.find(x => x.path === 'composer.json' && x.content); if (!f) return null; try { return JSON.parse(f.content) as Record<string, unkno…
/** Which `package.json` drives build/test labels (nested Nuxt monorepos). */
export function resolvePrimaryPackagePath(scan: ScanResult): string { const nuxtConfig = findNuxtConfigPath(scan); if (nuxtConfig) { const dir = path.posix.dirname(nuxtConfig.replace(/\\/g, '/')); const nested = dir === '.' ? 'package.js…
/** Human stack line — avoids listing Go/Python/TS from a few stray scripts. */
export function inferTechStackFromScan( scan: ScanResult, profile: ProjectStackProfile ): string[] { /* ~53 lines */ }
export function inferDefaultsFromScan(scan: ScanResult): Pick<BuildPlan, 'projectName' | 'projectDescription' | 'techStack' | 'buildCommand' | 'testCommand'> { /* ~76 lines */ }
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

// ── .cursor/rules/ctxgraph--cursor-rules-bundle-p21.mdc ──
// ── .cursor/rules/ctxgraph--src-graph-builder-plan-priority.mdc ──
// ── src/graph-builder/plan/priority.ts ──
export type InstructionPriority = 'P0' | 'P1' | 'P2';
/** Higher urgency wins (P0 > P1 > P2). */
export function maxPriority(a: InstructionPriority, b: InstructionPriority): InstructionPriority { return RANK[a] <= RANK[b] ? a : b; }
/**
 * Heuristic priority for a single source file (deterministic / metadata).
 * Aligns with planning prompt: P0 entry & critical paths, P1 frequent, P2 leaf/rare.
 */
export function inferFilePriority( relPath: string, opts?: { /* ~102 lines */ }
/** Subsystem priority = most urgent file in the chunk (mirror bundle or folder group). */
export function inferSubsystemPriority(sourceFiles: string[], scan?: ScanResult): InstructionPriority { /* ~28 lines */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-plan-repair.mdc ──
// ── src/graph-builder/plan/repair.ts ──
export function shouldExcludeFromSubsystems(relPath: string): boolean { if (isInstructionExcludedPath(relPath)) return true; const name = path.posix.basename(relPath); return INSTRUCTION_EXCLUDE_RE.some(r => r.test(name) || r.test(relPat…
/** Source-code paths the scanner read that merit their own instruction files. */
export function collectScannedSourcePaths(scan: ScanResult): string[] { return scan.files .filter(f => f.tier !== 3 && f.content.length > 0 && !shouldExcludeFromSubsystems(f.path)) .map(f => f.path) .sort(); }
/**
 * After LLM plan + gap-fill, merge subsystems whose source files all live
 * under the same canonical directory into a single instruction file.
 */
export function applyCanonicalGroupings(plan: BuildPlan, repairOpts?: RepairBuildPlanOptions): BuildPlan { /* ~36 lines */ }
export function dedupeSubsystemSourceFiles(plan: BuildPlan): BuildPlan { const seen = new Set<string>(); const subsystems: BuildPlanItem[] = []; for (const s of plan.subsystems) { const sourceFiles = s.sourceFiles.filter(p => { if (seen.…
export function groupPathsIntoAutoSubsystems( paths: string[], scan: ScanResult, usedInstructionRelPaths: Set<string>, repairOpts?: RepairBuildPlanOptions ): BuildPlanItem[] { /* prompt template (~106 lines) */ }
/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairBuildPlan( scan: ScanResult, rawPlan: BuildPlan | null, repairOpts?: RepairBuildPlanOptions ): BuildPlan { /* ~54 lines */ }
/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairOptionsFromConfig(config: Config): RepairBuildPlanOptions { return { subsystemGrouping: config.subsystemGrouping, maxFilesPerFolderSubsystem: config.maxFilesPerFolderSubsystem, subsystemLayout: config.subsystemLayou…
/** Config + scan heuristics (Laravel → by-folder, fewer 1-file-per-controller graphs). */
export function resolveRepairOptions(scan: ScanResult, config: Config): RepairBuildPlanOptions { const base = repairOptionsFromConfig(config); const profile = detectProjectStackProfile(scan); if ( shouldAutoFolderGrouping(scan, profile, …
// ── .cursor/rules/ctxgraph--src-graph-builder-plan-stack-profile.mdc ──
// ── src/graph-builder/plan/stack-profile.ts ──
export type ProjectStackProfile = { laravel: boolean; php: boolean; node: boolean; vue: boolean; nuxt: boolean; /** Repo-relative directory containing `nuxt.config.*` (e.g. `frontend/dev`). */ nuxtRoot?: string; };
/** First `nuxt.config.*` path in scan order (stable). */
export function findNuxtConfigPath(scan: ScanResult): string | undefined { for (const f of scan.files) { const p = f.path.replace(/\\/g, '/'); if (NUXT_CONFIG_RE.test(p)) return p; } return undefined; }
export function countScannedVueFiles(scan: ScanResult): number { return scan.files.filter(f => f.path.endsWith('.vue') && f.tier !== 3).length; }
export function detectProjectStackProfile(scan: ScanResult): ProjectStackProfile { /* ~24 lines */ }
/** Auto `by-folder` for Laravel / large PHP trees / Nuxt & large Vue apps. */
export function shouldAutoFolderGrouping( scan: ScanResult, profile: ProjectStackProfile, subsystemGrouping: 'default' | 'by-folder' ): boolean { /* ~16 lines */ }
// ── .cursor/rules/ctxgraph--src-graph-builder-prompt.mdc ──
// ── src/graph-builder/prompt.ts ──
/** Node / Python / Rust / PHP env access heuristics for Danger Zone + mermaid. */
export function fileReadsEnvironment(content: string): boolean { return /process\.env|os\.environ|os\.getenv\s*\(|std::env|getenv\s*\(|(?:^|[^\w$.])env\s*\(\s*['"][^'"]+['"]|(?:^|[^\w$])\$_ENV(?:\[|\b)|(?:^|[^\w$])\$_SERVER\s*\[/i.test( …
export function styleDirective(config: Config, target: 'notes' | 'root' | 'subsystem'): string { /* prompt template (~17 lines) */ }
export function loadSystemPrompt(): string { const candidates = [ path.join(__dirname, '../../prompts/graph-create-agent.md'), path.join(__dirname, '../../../graph-create-agent.md'), path.join(process.cwd(), 'graph-create-agent.md'), ]; …
export function loadExistingGraph(graphDir: string): string { const rootFile = path.join(graphDir, 'copilot-instructions.md'); if (!fs.existsSync(rootFile)) return ''; return fs.readFileSync(rootFile, 'utf8'); }


// CLI commands:
//   build
```

## Dependencies
**External:**
- ``

## Danger Zone 🔴
- **[fs]** filesystem I/O
