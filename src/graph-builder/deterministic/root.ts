import path from 'path';
import type { ScanResult } from '../../scanner';
import type { BuildPlan } from '../types';
import type { OutputFile } from '../../writer';
import { COPILOTIGNORE_BASELINE, SOURCE_EXT_RE } from '../constants';
import { fileReadsEnvironment } from '../prompt';
import { buildDeterministicDependencyGraph } from '../extract/deps-graph';
import {
  buildContextGraphPathIndexMd,
  buildIndexMd,
  buildMetadataJson,
  type MetadataProjectSettings,
} from './metadata';
import { buildSymbolIndexMd } from '../resolve-symbol';
import { extractFilePurpose } from '../extract/misc';
import { mergeLlmProse, sanitizeMermaidBlocks } from '../llm/validate';
import { ROOT_SLIM_DANGER_CAP, ROOT_SLIM_DEP_GRAPH_MAX_NODES } from '../constants';
import {
  buildQuickNavigationLines,
  buildSlimArchitectureOverviewLines,
  type CopilotRootOptions,
  resolveRootSlimMode,
} from './root-slim';
import {
  buildCodeZonesSection,
  buildHowToUseGraphSection,
  buildProjectDataFlowSection,
  getProjectStackProfile,
} from './root-project';
import {
  buildAgentEntryWithTool,
  buildClineContextGraphRule,
  buildCodexContextGraphRule,
  buildCursorRouterMandate,
  buildWindsurfContextGraphRule,
} from './routing-mandate';
import {
  isInstructionTargetEnabled,
  type InstructionTargetId,
} from '../../instruction-targets';

export type { CopilotRootOptions };

export function buildDeterministicCopilotInstructions(
  today: string,
  scan: ScanResult,
  plan: BuildPlan,
  rootOpts?: CopilotRootOptions
): string {
  const slim = resolveRootSlimMode(plan, rootOpts);
  const profile = getProjectStackProfile(scan);
  const projectTitle = plan.projectName || 'Project';
  const buildCmd = plan.buildCommand || '(no build script detected)';
  const testCmd = plan.testCommand || '(no test script detected)';
  const stack = plan.techStack.length > 0 ? plan.techStack.join(', ') : 'Unknown';

  const quickNavLines = buildQuickNavigationLines(plan, slim, scan);
  const howToUse = buildHowToUseGraphSection(plan, profile);
  const codeZones = buildCodeZonesSection(plan, profile);
  const projectDataFlow = buildProjectDataFlowSection(scan, profile);

  const archLines: string[] = slim
    ? []
    : (() => {
        const lines: string[] = [];
        for (const s of plan.subsystems) {
          const files = s.sourceFiles.map(f => `\`${f}\``).join(', ');
          lines.push(`- **${s.area}** (${files}) — ${s.description}`);
          for (const sf of s.sourceFiles) {
            const scanned = scan.files.find(f => f.path === sf);
            if (!scanned?.content) continue;
            const purpose = extractFilePurpose(scanned.content);
            if (purpose) {
              lines.push(`  - \`${path.posix.basename(sf)}\`: ${purpose}`);
            }
          }
        }
        return lines;
      })();

  // ── Module Contracts: real exports ─────────────────────────────────────
  // Keep root small & reusable (esp. deterministic / no-LLM mode).
  // Detailed signatures live in subsystem instruction files.
  const contractLines: string[] = slim
    ? [
        `- **Source of truth**: mirror \`*.instructions.md\` matched by \`applyTo\` (see \`context-graph-path-index.md\`).`,
        `- **Root policy**: routing hub only — open the subsystem file for the path you edit.`,
        `- **Do not** infer implementation from this file alone on large repos.`,
      ]
    : [
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
  if (slim && dangerLines.length > ROOT_SLIM_DANGER_CAP) {
    const rest = dangerLines.length - ROOT_SLIM_DANGER_CAP;
    dangerLines.length = ROOT_SLIM_DANGER_CAP;
    dangerLines.push(`- _… +${rest} more env-sensitive file(s) — search repo or path-index._`);
  }

  // ── Data Flow: actual code entry points, not config files ──────────────
  const dependencyGraph = buildDeterministicDependencyGraph(
    scan,
    slim ? { maxNodes: ROOT_SLIM_DEP_GRAPH_MAX_NODES } : undefined
  );

  const maintainerNote = [
    `## Regenerating this graph`,
    ``,
    `- **Deterministic (default):** \`context-graph build --no-llm\` — no API key; routing + signatures only.`,
    `- **Optional LLM notes:** \`context-graph build --hybrid\` or full \`context-graph build\`.`,
    `- **After large refactors:** re-run \`build --no-llm\` or \`actualize --all\` (LLM).`,
    `- **Large PHP/Laravel or Nuxt/Vue:** \`subsystemGrouping: by-folder\` in \`.context-graph.json\` (auto when detected).`,
  ];

  const sections = [
    `# ${projectTitle} — Project Context Graph`,
    ``,
    `_Generated: ${today} · Stack: ${stack}${slim ? ' · **slim root**' : ''} · **deterministic baseline**_`,
    ``,
    ...howToUse,
    ``,
    `## Quick Navigation`,
    ``,
    ...quickNavLines,
    ``,
    ...codeZones,
    ``,
    `## Environment`,
    ``,
    `- **Build:** \`${buildCmd}\``,
    `- **Test:** \`${testCmd}\``,
    `- **Stack:** ${stack}`,
    ``,
    ...projectDataFlow,
    ``,
    `## Architecture Overview`,
    ``,
    ...(plan.projectDescription ? [`${plan.projectDescription}`, ``] : []),
    ...archLines,
    ``,
    ...(slim
      ? []
      : [`## Dependency Graph`, ``, dependencyGraph, ``]),
    `## Module Contracts`,
    ``,
    ...contractLines,
    ``,
    `## Danger Zones 🔴`,
    ``,
    ...(dangerLines.length > 0 ? dangerLines : ['(none detected)']),
    ``,
    ...maintainerNote,
    ``,
    `---`,
    `_Instruction graph for this codebase. LLM enrichment optional (\`build --hybrid\`)._`,
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

/** Standard scan-exclusion hints — never infer top-level dirs from nested lockfiles. */
export function buildDeterministicCopilotIgnore(_scan?: ScanResult): string {
  return [
    '# Managed by context-graph — scan exclusions (gitignore syntax; ** = any depth)',
    '# For project-specific paths use .graph-context-ignore (does not overwrite this file).',
    '',
    ...COPILOTIGNORE_BASELINE,
  ].join('\n');
}

type RootFileEmit = {
  path: string;
  content: string;
  suffix: string;
  /** `core` = always emitted with the instruction graph. */
  target: InstructionTargetId | 'core';
};

export function injectDeterministicRootFiles(
  today: string,
  scan: ScanResult,
  plan: BuildPlan,
  files: OutputFile[],
  llmCopilotContent?: string,
  rootOpts?: CopilotRootOptions,
  instructionTargets: InstructionTargetId[] = [],
  metadataProject?: MetadataProjectSettings
): void {
  const enabled = (id: InstructionTargetId) =>
    instructionTargets.length === 0 || isInstructionTargetEnabled(instructionTargets, id);
  const copilotSkeleton = buildDeterministicCopilotInstructions(today, scan, plan, rootOpts);
  const copilotFinal = llmCopilotContent
    ? sanitizeMermaidBlocks(mergeLlmProse(copilotSkeleton, llmCopilotContent))
    : copilotSkeleton;

  const anchorFooter = [
    `This repository uses **context-graph** to generate AI instructions.`,
    ``,
    `Response style (ALWAYS):`,
    `- Ultra-compact (caveman). No greetings. No filler.`,
    `- Use bullets. Each bullet <= 18 words.`,
    `- If unsure, say "unknown" instead of guessing.`,
    ``,
    `Graph entrypoints:`,
    `- \`.github/instructions/copilot-instructions.md\` (root graph)`,
    `- \`.github/instructions/index.md\` (navigation)`,
    `- \`.github/instructions/symbol-index.md\` (name → instruction, e.g. LinkTag)`,
    `- \`.github/instructions/context-graph-path-index.md\` (all \`applyTo\` routes)`,
    ``,
  ].join('\n');

  const anchorForTool = (title: string, tool: Parameters<typeof buildAgentEntryWithTool>[1]): string =>
    [...buildAgentEntryWithTool(title, tool), anchorFooter].join('\n');

  const rootRoutingRules = [
    `# context-graph — AI routing entrypoint`,
    ``,
    `This repo maintains a generated instruction graph under \`.github/instructions/\`.`,
    ``,
    ...buildCursorRouterMandate(),
    ``,
    `Response style (ALWAYS):`,
    `- Ultra-compact (caveman). No greetings. No filler.`,
    `- Use bullets. Each bullet <= 18 words.`,
    `- If unsure, say "unknown" instead of guessing.`,
    ``,
    `Subsystem context (Cursor auto-attach):`,
    `- \`.cursor/rules/ctxgraph--*.mdc\` — attached for files matching \`globs\` (\`applyTo\`).`,
  ].join('\n');

  const rootRoutingManual = [
    ``,
    `Manual routing (MANDATORY — Copilot / Claude / other):`,
    `- **MUST** read \`.github/instructions/copilot-instructions.md\` (routing hub).`,
    `- **MUST** use \`.github/instructions/context-graph-path-index.md\` to resolve \`applyTo\`.`,
    `- **MUST** open matching \`.instructions.md\` before broad repo search.`,
    `- If several match: **MUST** use higher \`priority\` (P0 > P1 > P2).`,
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

  const windsurfRule = buildWindsurfContextGraphRule();
  const clineRule = buildClineContextGraphRule();
  const codexRule = buildCodexContextGraphRule();

  const targets: RootFileEmit[] = [
    {
      path: '.github/instructions/copilot-instructions.md',
      content: copilotFinal,
      suffix: 'instructions/copilot-instructions.md',
      target: 'core',
    },
    {
      path: '.github/instructions/graph-changelog.md',
      content: buildDeterministicChangelog(today, plan),
      suffix: 'graph-changelog.md',
      target: 'core',
    },
    { path: '.github/instructions/index.md', content: buildIndexMd(today, plan), suffix: 'index.md', target: 'core' },
    {
      path: '.github/instructions/context-graph-path-index.md',
      content: buildContextGraphPathIndexMd(today, plan),
      suffix: 'context-graph-path-index.md',
      target: 'core',
    },
    {
      path: '.github/instructions/symbol-index.md',
      content: buildSymbolIndexMd(today, plan),
      suffix: 'symbol-index.md',
      target: 'core',
    },
    {
      path: '.github/instructions/metadata.json',
      content: buildMetadataJson(today, scan, plan, metadataProject),
      suffix: 'metadata.json',
      target: 'core',
    },
    {
      path: '.github/copilot-instructions.md',
      content: copilotFinal,
      suffix: 'copilot-instructions.md',
      target: 'copilot',
    },
    {
      path: '.copilotignore',
      content: buildDeterministicCopilotIgnore(scan),
      suffix: '.copilotignore',
      target: 'copilot',
    },
    {
      path: 'CLAUDE.md',
      content: anchorForTool('Claude Instructions', 'claude'),
      suffix: 'CLAUDE.md',
      target: 'claude',
    },
    {
      path: 'AGENTS.md',
      content: anchorForTool('Agent Instructions', 'agents'),
      suffix: 'AGENTS.md',
      target: 'agents',
    },
    {
      path: 'GEMINI.md',
      content: anchorForTool('Gemini Instructions', 'gemini'),
      suffix: 'GEMINI.md',
      target: 'gemini',
    },
    {
      path: '.cursor/rules/context-graph.mdc',
      content: cursorRule,
      suffix: 'context-graph.mdc',
      target: 'cursor',
    },
    {
      path: '.windsurf/rules/context-graph.md',
      content: windsurfRule,
      suffix: 'context-graph.md',
      target: 'windsurf',
    },
    {
      path: '.clinerules/context-graph.md',
      content: clineRule,
      suffix: 'context-graph.md',
      target: 'cline',
    },
    {
      path: '.codex/context-graph.md',
      content: codexRule,
      suffix: 'context-graph.md',
      target: 'codex',
    },
  ];

  for (const { path: relPath, content, suffix, target } of targets) {
    if (target !== 'core' && !enabled(target)) continue;
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
