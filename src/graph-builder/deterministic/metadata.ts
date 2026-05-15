import type { ScanResult } from '../../scanner';
import type { BuildPlan } from '../types';
import { inferFilePriority } from '../plan/priority';

export function buildMetadataJson(today: string, scan: ScanResult, plan?: BuildPlan): string {
  const sourceFiles = scan.files.filter(f => f.tier !== 3 && f.content && f.lines > 0);

  // Determine complexity and danger_zone from actual content/size
  const getComplexity = (lines: number): 'low' | 'medium' | 'high' =>
    lines > 300 ? 'high' : lines > 100 ? 'medium' : 'low';

  const dangerPaths = new Set([
    'src/cli.ts',
    'src/config.ts',
    'src/project-root.ts',
    'src/graph-builder.ts',
    'src/writer.ts',
    'src/providers/openai.ts',
    'src/providers/anthropic.ts',
    'src/cli/commands/build.ts',
  ]);

  // Priority from plan if available
  const priorityMap = new Map<string, string>();
  if (plan) {
    for (const s of plan.subsystems) {
      for (const sf of s.sourceFiles) {
        priorityMap.set(sf, s.priority);
      }
    }
  }

  const filesObj: Record<string, unknown> = {};
  for (const f of sourceFiles) {
    filesObj[f.path] = {
      priority:
        priorityMap.get(f.path) ??
        inferFilePriority(f.path, { tier: f.tier, lines: f.lines, content: f.content }),
      lines: f.lines,
      complexity: getComplexity(f.lines),
      danger_zone: dangerPaths.has(f.path),
      last_updated: today,
    };
  }

  const hotspots = sourceFiles
    .filter(f => f.path.startsWith('src/'))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5)
    .map(f => f.path);

  return JSON.stringify({ generated: today, files: filesObj, hotspots }, null, 2);
}

/** Flat table: every instruction path ↔ applyTo ↔ sources (for LLMs and search). */
export function buildContextGraphPathIndexMd(today: string, plan: BuildPlan): string {
  const rows = [...plan.subsystems]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(s => {
      const applyEsc = s.applyTo.replace(/\|/g, '\\|');
      const src = s.sourceFiles.map(f => `\`${f}\``).join(', ');
      return `| \`${s.file}\` | \`${applyEsc}\` | ${s.priority} | ${s.area} | ${src} |`;
    });
  return [
    `# context-graph — path index`,
    ``,
    `_Generated: ${today}. One row per \`.instructions.md\`; use \`applyTo\` for editor routing._`,
    ``,
    `| Instruction (relative to \`.github/instructions/\`) | applyTo | P | Area | Source files |`,
    `|---|---|---|---|---|`,
    ...rows,
    ``,
    `Companion: [index.md](index.md) (grouped). Root graph: [copilot-instructions.md](copilot-instructions.md).`,
  ].join('\n');
}

/** Build index.md content from plan subsystems — no LLM guessing */
export function buildIndexMd(today: string, plan?: BuildPlan): string {
  if (!plan) return '';

  const sorted = [...plan.subsystems].sort((a, b) => a.file.localeCompare(b.file));

  // Group by first path segment of instruction file (works for mirror + canonical)
  const groups: Record<string, typeof plan.subsystems> = {};
  for (const s of sorted) {
    const seg = s.file.includes('/') ? s.file.split('/')[0] : 'root';
    const key = seg.charAt(0).toUpperCase() + seg.slice(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  const lines: string[] = [
    `# Context Graph — Instruction Index`,
    ``,
    `_Generated: ${today}_`,
    ``,
    `**Full path ↔ applyTo list:** [context-graph-path-index.md](context-graph-path-index.md)`,
    ``,
  ];

  for (const [group, items] of Object.entries(groups)) {
    lines.push(`## ${group}`);
    lines.push(`| File | Source Files | Priority | Area | Description |`);
    lines.push(`|------|-------------|----------|------|-------------|`);
    for (const s of items) {
      const srcList = s.sourceFiles.map(f => `\`${f}\``).join(', ');
      lines.push(`| [${s.file}](${s.file}) | ${srcList} | ${s.priority} | ${s.area} | ${s.description} |`);
    }
    lines.push(``);
  }

  lines.push(`## Quick Navigation`);
  lines.push(`- **Danger Zones**: see \`copilot-instructions.md § Danger Zones\``);
  lines.push(`- **Data Flows**: see \`copilot-instructions.md § Data Flow\``);
  lines.push(`- **Workflows**: see \`copilot-instructions.md § Workflows (no LLM required)\``);
  lines.push(`- **Troubleshooting**: see \`copilot-instructions.md § Troubleshooting\``);

  return lines.join('\n');
}
