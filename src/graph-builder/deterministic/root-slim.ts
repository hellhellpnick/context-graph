import path from 'path';
import type { ScanResult } from '../../scanner';
import type { BuildPlan, BuildPlanItem } from '../types';
import { detectProjectStackProfile } from '../plan/stack-profile';
import { pickZoneNavigationHighlights } from './root-project';
import {
  ROOT_SLIM_ARCH_GROUP_CAP,
  ROOT_SLIM_AUTO_SOURCE_FILES_THRESHOLD,
  ROOT_SLIM_AUTO_SUBSYSTEM_THRESHOLD,
  ROOT_SLIM_QUICK_NAV_CAP,
} from '../constants';

export interface CopilotRootOptions {
  /** Force slim root (e.g. `contextDepth: slim`). Auto when subsystems ≥ threshold. */
  slimRoot?: boolean;
}

const PRIORITY_RANK: Record<BuildPlanItem['priority'], number> = { P0: 0, P1: 1, P2: 2 };

export function resolveRootSlimMode(plan: BuildPlan, opts?: CopilotRootOptions): boolean {
  if (opts?.slimRoot === true) return true;
  if (opts?.slimRoot === false) return false;
  if (plan.subsystems.length >= ROOT_SLIM_AUTO_SUBSYSTEM_THRESHOLD) return true;
  const sourceFiles = plan.subsystems.reduce((n, s) => n + s.sourceFiles.length, 0);
  return sourceFiles >= ROOT_SLIM_AUTO_SOURCE_FILES_THRESHOLD;
}

/** Directory key for grouping (up to 3 segments under repo root). */
export function sourceDirGroupKey(sourcePath: string): string {
  const norm = sourcePath.replace(/\\/g, '/');
  if (!norm.includes('/')) return '.';
  const parts = path.posix.dirname(norm).split('/').filter(Boolean);
  const depth = parts[0] === 'src' || parts[0] === 'app' ? 3 : 2;
  return parts.slice(0, Math.min(depth, parts.length)).join('/') || '.';
}

export interface DirGroupSummary {
  dir: string;
  subsystemCount: number;
  sourceFileCount: number;
  bestPriority: BuildPlanItem['priority'];
}

export function summarizeSubsystemDirGroups(plan: BuildPlan): DirGroupSummary[] {
  const groups = new Map<string, DirGroupSummary>();

  for (const s of plan.subsystems) {
    const key = s.sourceFiles.length > 0 ? sourceDirGroupKey(s.sourceFiles[0]) : '.';
    const g = groups.get(key) ?? {
      dir: key,
      subsystemCount: 0,
      sourceFileCount: 0,
      bestPriority: 'P2' as BuildPlanItem['priority'],
    };
    g.subsystemCount += 1;
    g.sourceFileCount += s.sourceFiles.length;
    if (PRIORITY_RANK[s.priority] < PRIORITY_RANK[g.bestPriority]) {
      g.bestPriority = s.priority;
    }
    groups.set(key, g);
  }

  return [...groups.values()].sort((a, b) => {
    const pr = PRIORITY_RANK[a.bestPriority] - PRIORITY_RANK[b.bestPriority];
    if (pr !== 0) return pr;
    if (b.subsystemCount !== a.subsystemCount) return b.subsystemCount - a.subsystemCount;
    return a.dir.localeCompare(b.dir);
  });
}

function sortedSubsystemsForNav(plan: BuildPlan): BuildPlanItem[] {
  return [...plan.subsystems].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    return a.area.localeCompare(b.area);
  });
}

export function buildQuickNavigationLines(
  plan: BuildPlan,
  slim: boolean,
  scan?: ScanResult
): string[] {
  const n = plan.subsystems.length;
  const pathIndex = '`.github/instructions/context-graph-path-index.md`';

  if (!slim) {
    const seenAreas = new Set<string>();
    const lines: string[] = [];
    for (const s of plan.subsystems) {
      if (seenAreas.has(s.area)) continue;
      seenAreas.add(s.area);
      const uc = s.useCases
        .filter(u => !u.includes('navigating this subsystem'))
        .slice(0, 3);
      const whenStr =
        uc.length > 0
          ? uc.join(' · ')
          : s.sourceFiles.map(f => `editing \`${path.posix.basename(f)}\``).slice(0, 3).join(' · ');
      lines.push(`**${s.area}** → \`.github/instructions/${s.file}\`\n  When: ${whenStr}`);
    }
    return lines;
  }

  const lines: string[] = [
    `_Slim root (${n} subsystems): use path-index for full \`applyTo\` routing — do not load every module from here._`,
    ``,
    `**Full routing table** → ${pathIndex} (${n} rows)`,
    `**Grouped index** → \`.github/instructions/index.md\``,
    ``,
    `**How to route:** open the \`*.instructions.md\` whose \`applyTo\` matches the file you edit (see ${pathIndex}).`,
    ``,
  ];

  const profile = scan ? detectProjectStackProfile(scan) : { laravel: false, php: false, node: false, vue: false, nuxt: false };
  if (profile.laravel || profile.nuxt || (profile.vue && plan.subsystems.length >= 40)) {
    lines.push(...pickZoneNavigationHighlights(plan, profile, ROOT_SLIM_QUICK_NAV_CAP));
    const bulletLines = lines.filter(l => l.startsWith('- **'));
    const omitted = n - bulletLines.length;
    if (omitted > 0) {
      lines.push(
        ``,
        `_+${omitted} more subsystem(s) — see ${pathIndex} (search your file path)._`
      );
    }
    return lines;
  }

  lines.push(`### P0 / P1 highlights (top ${ROOT_SLIM_QUICK_NAV_CAP})`);

  const seenAreas = new Set<string>();
  let shown = 0;
  for (const s of sortedSubsystemsForNav(plan)) {
    if (s.priority === 'P2') continue;
    if (seenAreas.has(s.area)) continue;
    seenAreas.add(s.area);
    const uc = s.useCases
      .filter(u => !u.includes('navigating this subsystem'))
      .slice(0, 2);
    const whenStr =
      uc.length > 0
        ? uc.join(' · ')
        : s.sourceFiles.map(f => `\`${path.posix.basename(f)}\``).slice(0, 2).join(' · ');
    lines.push(`- **${s.area}** [${s.priority}] → \`${s.file}\` — ${whenStr}`);
    shown++;
    if (shown >= ROOT_SLIM_QUICK_NAV_CAP) break;
  }

  if (shown === 0) {
    for (const s of sortedSubsystemsForNav(plan)) {
      if (seenAreas.has(s.area)) continue;
      seenAreas.add(s.area);
      lines.push(
        `- **${s.area}** [${s.priority}] → \`${s.file}\` — \`${s.sourceFiles[0] ?? '?'}\``
      );
      shown++;
      if (shown >= Math.min(12, ROOT_SLIM_QUICK_NAV_CAP)) break;
    }
  }

  const omitted = n - shown;
  if (omitted > 0) {
    lines.push(
      ``,
      `_+${omitted} more subsystem(s) — see ${pathIndex} (sort by P0/P1/P2)._`
    );
  }

  return lines;
}

export function buildSlimArchitectureOverviewLines(plan: BuildPlan): string[] {
  const allGroups = summarizeSubsystemDirGroups(plan);
  const groups = allGroups.slice(0, ROOT_SLIM_ARCH_GROUP_CAP);
  const totalGroups = allGroups.length;
  const lines: string[] = [
    `Directory groups (${plan.subsystems.length} instruction files). Per-file detail lives in mirror \`*.instructions.md\` — not listed here.`,
    ``,
  ];

  for (const g of groups) {
    const glob = g.dir === '.' ? '*.{ext}' : `${g.dir}/**`;
    lines.push(
      `- **\`${glob}\`** — ${g.subsystemCount} instruction file(s), ${g.sourceFileCount} source file(s), best **${g.bestPriority}**`
    );
  }

  if (totalGroups > groups.length) {
    lines.push(
      `- _… +${totalGroups - groups.length} more directory group(s) — see \`context-graph-path-index.md\`._`
    );
  }

  return lines;
}
