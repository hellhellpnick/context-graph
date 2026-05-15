import path from 'path';
import type { ScanResult } from '../../scanner';
import type { BuildPlan } from '../types';
import type { OutputFile } from '../../writer';
import { SOURCE_EXT_RE } from '../constants';
import { fileReadsEnvironment } from '../prompt';
import { buildDeterministicDependencyGraph } from '../extract/deps-graph';
import {
  buildContextGraphPathIndexMd,
  buildIndexMd,
  buildMetadataJson,
} from './metadata';
import { extractFilePurpose } from '../extract/misc';
import { mergeLlmProse, sanitizeMermaidBlocks } from '../llm/validate';

export function buildDeterministicCopilotInstructions(
  today: string,
  scan: ScanResult,
  plan: BuildPlan
): string {
  const projectTitle = plan.projectName || 'Project';
  const buildCmd = plan.buildCommand || 'npm run build';
  const testCmd = plan.testCommand || '(no test script detected)';
  const stack = plan.techStack.length > 0 ? plan.techStack.join(', ') : 'Unknown';

  // ── Quick Navigation: dedupe by area, use real plan paths ──────────────
  const seenAreas = new Set<string>();
  const quickNavLines: string[] = [];
  for (const s of plan.subsystems) {
    if (seenAreas.has(s.area)) continue;
    seenAreas.add(s.area);
    const uc = s.useCases
      .filter(u => !u.includes('navigating this subsystem'))
      .slice(0, 3);
    const whenStr = uc.length > 0 ? uc.join(' · ') : s.sourceFiles.map(f => `editing \`${path.posix.basename(f)}\``).slice(0, 3).join(' · ');
    quickNavLines.push(`**${s.area}** → \`.github/instructions/${s.file}\`\n  When: ${whenStr}`);
  }

  // ── Architecture Overview: subsystem + per-file purpose summaries ───────
  const archLines: string[] = [];
  for (const s of plan.subsystems) {
    const files = s.sourceFiles.map(f => `\`${f}\``).join(', ');
    archLines.push(`- **${s.area}** (${files}) — ${s.description}`);
    for (const sf of s.sourceFiles) {
      const scanned = scan.files.find(f => f.path === sf);
      if (!scanned?.content) continue;
      const purpose = extractFilePurpose(scanned.content);
      if (purpose) {
        archLines.push(`  - \`${path.posix.basename(sf)}\`: ${purpose}`);
      }
    }
  }

  // ── Module Contracts: real exports ─────────────────────────────────────
  // Keep root small & reusable (esp. deterministic / no-LLM mode).
  // Detailed signatures live in subsystem instruction files.
  const contractLines: string[] = [
    `- **Source of truth**: per-subsystem \`*.instructions.md\` files (open via Quick Navigation / index.md).`,
    `- **Root policy**: do not embed large signatures here; keep root fast to load.`,
  ];

  // ── Danger Zones: only real source files, not docs/prompts ─────────────
  const DANGER_EXCLUDE = new Set([
    '.copilotignore',
    '.graph-context-ignore',
    '.context-graph-ignore',
    '.env.example',
    '.env.schema',
  ]);
  const dangerLines: string[] = [];
  const tier0Files = scan.files.filter(f =>
    f.tier === 0 && f.content && !DANGER_EXCLUDE.has(path.posix.basename(f.path))
  );
  for (const f of tier0Files) {
    dangerLines.push(`- \`${f.path}\` — infrastructure / CI`);
  }
  const envSourceFiles = scan.files.filter(f =>
    f.content &&
    SOURCE_EXT_RE.test(f.path) &&
    fileReadsEnvironment(f.content)
  );
  for (const f of envSourceFiles) {
    if (!dangerLines.some(l => l.includes(f.path))) {
      dangerLines.push(`- \`${f.path}\` — reads environment variables`);
    }
  }

  // ── Data Flow: actual code entry points, not config files ──────────────
  const codeEntryFiles = scan.files
    .filter(f => f.tier === 1 && f.content && SOURCE_EXT_RE.test(f.path))
    .map(f => `\`${f.path}\``);

  const dataFlowChain = codeEntryFiles.length > 0
    ? `Entry points: ${codeEntryFiles.join(' → ')}`
    : '(no code entry points detected)';

  const dependencyGraph = buildDeterministicDependencyGraph(scan);

  const workflows = [
    `## Workflows (no LLM required)`,
    ``,
    `- **Build instructions**: \`context-graph build --no-llm\` (deterministic graph + Cursor rules + hook).`,
    `- **Hybrid (local LLM)**: \`context-graph build --hybrid\` — scaffold + notes; **not** \`build hybrid\` (that was a mistaken path).`,
    `- **Update instructions**: \`context-graph actualize --all --dry-run\` (preview) → drop \`--dry-run\` (apply).`,
    `- **CI check**: \`context-graph validate\` (exit 1 if source changed since last build ref).`,
    `- **On push**: pre-push hook runs \`context-graph hook-check\` (reminder; never blocks push).`,
  ];

  const configNotes = [
    `## Config & Precedence`,
    ``,
    `- **Main config**: \`.context-graph.json\` (created by \`context-graph build\` if missing).`,
    `- **Overrides**: CLI flags \`--provider/--model\` (highest precedence for build).`,
    `- **Env overrides**: \`CONTEXT_GRAPH_PROVIDER\`, \`CONTEXT_GRAPH_MODEL\` (read from \`.env\` / env).`,
    `- **Project root**: implicit \`[dir]\` uses Git repo root when the shell cwd is a subfolder (so outputs land in the real repo). Set \`CONTEXT_GRAPH_ROOT\` to an absolute workspace path to override (e.g. VS Code/Cursor terminal profile).`,
    `- **Scan exclusions**: optional \`.graph-context-ignore\` or \`.context-graph-ignore\` at repo root — same syntax as \`.gitignore\`; applied only to context-graph scanning (after \`.gitignore\` / \`.copilotignore\`).`,
    `- **Instruction paths**: \`subsystemLayout\` in \`.context-graph.json\`: \`mirror\` (default, paths mirror repo tree) or \`canonical\` (legacy \`core/\` / \`infra/\`). Env: \`CONTEXT_GRAPH_SUBSYSTEM_LAYOUT\`.`,
    `- **API key**: env var from config (\`provider.apiKeyEnv\`); Ollama allows missing key.`,
  ];

  const troubleshooting = [
    `## Troubleshooting`,
    ``,
    `- **Graph missing**: run \`context-graph build --no-llm\` (creates \`.github/instructions/\`).`,
    `- **Validate fails**: run \`context-graph actualize --all\` then commit instruction changes.`,
    `- **Wrong output folder**: you ran the CLI from a nested folder; use repo root cwd, or set \`CONTEXT_GRAPH_ROOT\`, or pass an explicit \`context-graph build path/to/package\` for a sub-root graph.`,
    `- **Actualize returns no files**: try \`--all\`; LLM mode needs configured provider/model/key.`,
    `- **Output parse issues**: model must emit only \`<<<FILE: ...>>>\` blocks (no prose).`,
    `- **\`build hybrid\` / ENOENT**: use \`build --hybrid\`; \`hybrid\` is not a directory — see \`normalizeBuildDirArg\` in \`project-root.ts\`.`,
  ];

  const dataFlows = [
    `## Data Flow`,
    ``,
    dataFlowChain,
    ``,
    `- **BUILD**: scanProject → buildGraphMultiPass/hybrid/deterministic → writeOutputFiles → saveLastBuildRef.`,
    `- **ACTUALIZE**: git diff since last ref → scanProject → buildGraph(mode=ACTUALIZE) → writeOutputFiles → saveLastBuildRef.`,
    `- **VALIDATE**: git diff since last ref → filterSignificantFiles → exit 1 if outdated.`,
  ];

  const sections = [
    `# ${projectTitle} — Project Context Graph`,
    ``,
    `_Generated: ${today} · Stack: ${stack}_`,
    ``,
    `## Quick Navigation`,
    ``,
    ...quickNavLines,
    ``,
    `## Environment`,
    ``,
    `- **Build:** \`${buildCmd}\``,
    `- **Test:** \`${testCmd}\``,
    `- **Stack:** ${stack}`,
    ``,
    ...workflows,
    ``,
    ...configNotes,
    ``,
    `## Architecture Overview`,
    ``,
    ...(plan.projectDescription ? [`${plan.projectDescription}`, ``] : []),
    ...archLines,
    ``,
    `## Dependency Graph`,
    ``,
    dependencyGraph,
    ``,
    ...dataFlows,
    ``,
    `## Module Contracts`,
    ``,
    ...contractLines,
    ``,
    `## Danger Zones 🔴`,
    ``,
    ...(dangerLines.length > 0 ? dangerLines : ['(none detected)']),
    ``,
    ...troubleshooting,
    ``,
    `---`,
    `_This file is auto-generated by context-graph. Descriptive prose is enriched by LLM when available._`,
  ];

  return sections.join('\n');
}

export function buildDeterministicChangelog(today: string, plan: BuildPlan): string {
  const lines = [
    `# Context Graph — Changelog`,
    ``,
    `## ${today} — Initial Build`,
    ``,
    `Subsystems created:`,
    ...plan.subsystems.map(s => `- \`${s.file}\` — ${s.area}: ${s.description}`),
    ``,
    `---`,
    `_Auto-generated by context-graph._`,
  ];
  return lines.join('\n');
}

export function buildDeterministicCopilotIgnore(scan: ScanResult): string {
  const lines = [
    '# Managed by context-graph — paths excluded from Copilot context',
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.nyc_output/',
    '__pycache__/',
    '.venv/',
    'venv/',
    '.git/',
    '*.lock',
    'package-lock.json',
    '*.min.js',
    '*.min.css',
    '*.map',
  ];
  // Add Tier 3 directories that actually exist in the scan
  const tier3Dirs = new Set<string>();
  for (const f of scan.files) {
    if (f.tier === 3) {
      const top = f.path.split('/')[0];
      if (top && !lines.includes(`${top}/`)) tier3Dirs.add(top);
    }
  }
  for (const d of [...tier3Dirs].sort()) {
    lines.push(`${d}/`);
  }
  return lines.join('\n');
}

export function injectDeterministicRootFiles(
  today: string,
  scan: ScanResult,
  plan: BuildPlan,
  files: OutputFile[],
  llmCopilotContent?: string
): void {
  const copilotSkeleton = buildDeterministicCopilotInstructions(today, scan, plan);
  const copilotFinal = llmCopilotContent
    ? sanitizeMermaidBlocks(mergeLlmProse(copilotSkeleton, llmCopilotContent))
    : copilotSkeleton;

  const anchorForOtherAgents = (name: string): string => [
    `# ${name}`,
    ``,
    `This repository uses **context-graph** to generate AI instructions.`,
    ``,
    `Response style (ALWAYS):`,
    `- Ultra-compact (caveman). No greetings. No filler.`,
    `- Prefer bullets. Each bullet <= 18 words.`,
    `- If unsure, say "unknown" instead of guessing.`,
    ``,
    `Start here:`,
    `- \`.github/instructions/copilot-instructions.md\` (root graph)`,
    `- \`.github/instructions/index.md\` (navigation)`,
    `- \`.github/instructions/context-graph-path-index.md\` (all \`applyTo\` routes)`,
    ``,
    `Cursor (auto, no manual routing):`,
    `- \`.cursor/rules/context-graph.mdc\` — always on`,
    `- \`.cursor/rules/ctxgraph--*.mdc\` — one rule per subsystem; \`globs\` = \`applyTo\``,
    ``,
    `Other tools — read \`.github/instructions/**/*.instructions.md\` when \`applyTo\` matches the file you edit.`,
    ``,
  ].join('\n');

  const rootRoutingRules = [
    `# context-graph — AI routing entrypoint`,
    ``,
    `This repo maintains a generated instruction graph under \`.github/instructions/\`.`,
    ``,
    `Response style (ALWAYS):`,
    `- Ultra-compact (caveman). No greetings. No filler.`,
    `- Prefer bullets. Each bullet <= 18 words.`,
    `- If unsure, say "unknown" instead of guessing.`,
    ``,
    `Subsystem context (automatic in Cursor):`,
    `- \`.cursor/rules/ctxgraph--*.mdc\` — attached when you edit files matching \`globs\` (from \`applyTo\`).`,
  ].join('\n');

  const rootRoutingManual = [
    ``,
    `Manual routing (Copilot / Claude / other):`,
    `- \`.github/instructions/copilot-instructions.md\``,
    `- \`.github/instructions/context-graph-path-index.md\``,
    `- Match \`.instructions.md\` by \`applyTo\`; prefer higher \`priority\` (P0>P1>P2).`,
    ``,
    `Instructions are authoritative over guesses.`,
    ``,
  ].join('\n');

  // Cursor rule format is markdown with frontmatter-like metadata; keep it simple and generic.
  const cursorRule = [
    '---',
    'description: "context-graph routing rules"',
    'globs: "**/*"',
    'alwaysApply: true',
    '---',
    '',
    rootRoutingRules,
    rootRoutingManual,
  ].join('\n');

  const clineRule = [rootRoutingRules, rootRoutingManual].join('\n');
  const windsurfRule = clineRule;
  const codexRule = clineRule;

  const targets: Array<{ path: string; content: string; suffix: string }> = [
    // Primary graph file (tooling reads this; unique suffix to avoid collisions with .github/ copy)
    { path: '.github/instructions/copilot-instructions.md', content: copilotFinal, suffix: 'instructions/copilot-instructions.md' },
    // Official Copilot entrypoint (some tools only look here).
    { path: '.github/copilot-instructions.md', content: copilotFinal, suffix: 'copilot-instructions.md' },
    { path: '.github/instructions/graph-changelog.md', content: buildDeterministicChangelog(today, plan), suffix: 'graph-changelog.md' },
    { path: '.github/instructions/index.md', content: buildIndexMd(today, plan), suffix: 'index.md' },
    {
      path: '.github/instructions/context-graph-path-index.md',
      content: buildContextGraphPathIndexMd(today, plan),
      suffix: 'context-graph-path-index.md',
    },
    { path: '.github/instructions/metadata.json', content: buildMetadataJson(today, scan, plan), suffix: 'metadata.json' },
    { path: '.copilotignore', content: buildDeterministicCopilotIgnore(scan), suffix: '.copilotignore' },
    // Common “agent” entrypoints across ecosystems.
    { path: 'CLAUDE.md', content: anchorForOtherAgents('Claude Instructions'), suffix: 'CLAUDE.md' },
    { path: 'AGENTS.md', content: anchorForOtherAgents('Agent Instructions'), suffix: 'AGENTS.md' },
    { path: 'GEMINI.md', content: anchorForOtherAgents('Gemini Instructions'), suffix: 'GEMINI.md' },

    // “Rule files” for popular agent tools (best-effort; safe if ignored).
    { path: '.cursor/rules/context-graph.mdc', content: cursorRule, suffix: 'context-graph.mdc' },
    { path: '.windsurf/rules/context-graph.md', content: windsurfRule, suffix: 'context-graph.md' },
    { path: '.clinerules/context-graph.md', content: clineRule, suffix: 'context-graph.md' },
    { path: '.codex/context-graph.md', content: codexRule, suffix: 'context-graph.md' },
  ];

  for (const { path: relPath, content, suffix } of targets) {
    const exactIdx = files.findIndex(f => f.path === relPath);
    if (exactIdx >= 0) {
      files[exactIdx] = { path: relPath, content };
      continue;
    }

    // Avoid collisions between:
    // - .github/instructions/copilot-instructions.md
    // - .github/copilot-instructions.md
    // Both share the same basename; loose matching would overwrite one with the other.
    if (relPath === '.github/instructions/copilot-instructions.md' || relPath === '.github/copilot-instructions.md') {
      files.push({ path: relPath, content });
      continue;
    }

    const looseIdx = files.findIndex(f => f.path.endsWith(`/${suffix}`) || f.path === suffix);
    if (looseIdx >= 0) files[looseIdx] = { path: relPath, content };
    else files.push({ path: relPath, content });
  }
}
