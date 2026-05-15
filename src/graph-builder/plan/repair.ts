import path from 'path';
import type { Config } from '../../config';
import type { ScanResult } from '../../scanner';
import type { BuildPlan, BuildPlanItem, RepairBuildPlanOptions } from '../types';
import {
  INSTRUCTION_EXCLUDE_RE,
  MAX_FILES_PER_FOLDER_SUBSYSTEM_DEFAULT,
  MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_DEFAULT,
  SPLIT_DIRS,
} from '../constants';
import {
  autoInstructionStem,
  folderInstructionRelPath,
  humanAreaName,
  mirrorInstructionRelPath,
  padUseCases,
  partitionInstructionChunks,
  shortHash,
} from './layout';
import { inferDefaultsFromScan } from './infer';
import { inferSubsystemPriority } from './priority';

export function shouldExcludeFromSubsystems(relPath: string): boolean {
  const name = path.posix.basename(relPath);
  return INSTRUCTION_EXCLUDE_RE.some(r => r.test(name) || r.test(relPath));
}

/** Source-code paths the scanner read that merit their own instruction files. */
export function collectScannedSourcePaths(scan: ScanResult): string[] {
  return scan.files
    .filter(f => f.tier !== 3 && f.content.length > 0 && !shouldExcludeFromSubsystems(f.path))
    .map(f => f.path)
    .sort();
}

/** Known groupings that match the `graph-create-agent.md` conventions (core/ + infra/). */
const CANONICAL_GROUPS: Array<{ dir: string; area: string; file: string; priority: 'P0' | 'P1' | 'P2' }> = [
  { dir: 'src/providers', area: 'LLM Providers',  file: 'infra/providers.instructions.md',   priority: 'P1' },
];

/**
 * After LLM plan + gap-fill, merge subsystems whose source files all live
 * under the same canonical directory into a single instruction file.
 */
export function applyCanonicalGroupings(plan: BuildPlan, repairOpts?: RepairBuildPlanOptions): BuildPlan {
  if ((repairOpts?.subsystemLayout ?? 'mirror') === 'mirror') {
    return plan;
  }
  const subsystems = [...plan.subsystems];
  for (const group of CANONICAL_GROUPS) {
    const prefix = group.dir.endsWith('/') ? group.dir : `${group.dir}/`;
    const matchIdx: number[] = [];
    for (let i = 0; i < subsystems.length; i++) {
      if (subsystems[i].sourceFiles.some(f => f.startsWith(prefix) || f === group.dir)) {
        matchIdx.push(i);
      }
    }
    if (matchIdx.length === 0) continue;
    const merged: string[] = [];
    const useCases: string[] = [];
    for (const i of matchIdx) {
      merged.push(...subsystems[i].sourceFiles);
      useCases.push(...subsystems[i].useCases);
    }
    const deduped = [...new Set(merged)];
    const dedupedUC = [...new Set(useCases)].slice(0, 6);
    const replacement: BuildPlanItem = {
      file: group.file,
      area: group.area,
      priority: group.priority,
      sourceFiles: deduped,
      applyTo: `${group.dir}/**`,
      useCases: dedupedUC,
      description: `All modules under ${group.dir}`,
    };
    for (const i of matchIdx.reverse()) subsystems.splice(i, 1);
    subsystems.push(replacement);
  }
  return { ...plan, subsystems };
}


export function dedupeSubsystemSourceFiles(plan: BuildPlan): BuildPlan {
  const seen = new Set<string>();
  const subsystems: BuildPlanItem[] = [];
  for (const s of plan.subsystems) {
    const sourceFiles = s.sourceFiles.filter(p => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    if (sourceFiles.length === 0) continue;
    subsystems.push({ ...s, sourceFiles });
  }
  return { ...plan, subsystems };
}

export function groupPathsIntoAutoSubsystems(
  paths: string[],
  scan: ScanResult,
  usedInstructionRelPaths: Set<string>,
  repairOpts?: RepairBuildPlanOptions
): BuildPlanItem[] {
  if (paths.length === 0) return [];

  const byFolder = repairOpts?.subsystemGrouping === 'by-folder';
  const folderMax = Math.max(
    4,
    Math.min(200, repairOpts?.maxFilesPerFolderSubsystem ?? MAX_FILES_PER_FOLDER_SUBSYSTEM_DEFAULT)
  );

  const byDir = new Map<string, string[]>();
  for (const p of paths) {
    const dir = p.includes('/') ? path.posix.dirname(p) : '.';
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(p);
  }

  const items: BuildPlanItem[] = [];
  const sortedDirs = [...byDir.keys()].sort((a, b) => a.localeCompare(b));

  for (const dir of sortedDirs) {
    const list = (byDir.get(dir) ?? []).sort();
    const topDir = dir.split('/')[0];
    const maxBundle = byFolder
      ? folderMax
      : MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_DEFAULT;

    const chunks: string[][] = SPLIT_DIRS.has(topDir)
      ? list.map(p => [p])
      : partitionInstructionChunks(list, scan, maxBundle);

    const totalParts = chunks.length || 1;

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]!;
      const partIndex = ci + 1;

      const layout = repairOpts?.subsystemLayout ?? 'mirror';

      let rel: string;
      if (layout === 'mirror') {
        rel = mirrorInstructionRelPath(dir, chunk, partIndex, totalParts, usedInstructionRelPaths);
      } else if (byFolder) {
        rel = folderInstructionRelPath(dir, partIndex, totalParts, chunk, usedInstructionRelPaths);
      } else {
        rel = `${autoInstructionStem(dir, chunk, partIndex)}.instructions.md`;
        while (usedInstructionRelPaths.has(rel)) {
          rel = `auto/${shortHash(rel + chunk.join(','))}.instructions.md`;
        }
        usedInstructionRelPaths.add(rel);
      }

      const mirrorDesc =
        chunk.length === 1
          ? `Mirror — \`${chunk[0]}\``
          : `Mirror — \`${dir}/\` (${chunk.length} files${totalParts > 1 ? `, part ${partIndex}/${totalParts}` : ''})`;

      const applyTo =
        chunk.length === 1
          ? chunk[0]
          : dir === '.'
            ? chunk[0]
            : `${dir}/**`;

      const area = chunk.length === 1
        ? humanAreaName(path.posix.basename(chunk[0]))
        : dir === '.' ? 'Root files' : humanAreaName(dir.split('/').pop()!);

      const folderDesc =
        totalParts > 1
          ? `${area} — all source in \`${dir}/\` (part ${partIndex}/${totalParts}, ${chunk.length} files)`
          : `${area} — all source in \`${dir}/\` (${chunk.length} files)`;

      items.push({
        file: rel,
        area,
        priority: inferSubsystemPriority(chunk, scan),
        sourceFiles: chunk,
        applyTo,
        useCases: padUseCases(chunk.map(f => `editing or refactoring \`${path.posix.basename(f)}\``)),
        description:
          layout === 'mirror'
            ? mirrorDesc
            : byFolder
              ? folderDesc
              : chunk.length === 1
                ? `${area} — ${chunk[0]}`
                : `${area} — bundle under ${dir} (${chunk.length} files)`,
      });
    }
  }

  return items;
}

/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */

export function repairBuildPlan(
  scan: ScanResult,
  rawPlan: BuildPlan | null,
  repairOpts?: RepairBuildPlanOptions
): BuildPlan {
  const allPaths = collectScannedSourcePaths(scan);
  const defaults = inferDefaultsFromScan(scan);

  let plan: BuildPlan = rawPlan?.subsystems?.length
    ? {
      projectName: rawPlan.projectName || defaults.projectName,
      projectDescription: rawPlan.projectDescription || defaults.projectDescription,
      techStack: rawPlan.techStack?.length ? rawPlan.techStack : defaults.techStack,
      buildCommand: rawPlan.buildCommand ?? defaults.buildCommand,
      testCommand: rawPlan.testCommand ?? defaults.testCommand,
      subsystems: rawPlan.subsystems.map(s => ({
        ...s,
        sourceFiles: [...(Array.isArray(s.sourceFiles) ? s.sourceFiles : [])],
      })),
    }
    : {
      ...defaults,
      subsystems: [],
    };

  const GH_PREFIX = '.github/instructions/';

  // Normalize: strip ".github/instructions/" prefix from `file` if the LLM included it
  plan = {
    ...plan,
    subsystems: plan.subsystems.map(s => ({
      ...s,
      file: s.file.startsWith(GH_PREFIX) ? s.file.slice(GH_PREFIX.length) : s.file,
      sourceFiles: s.sourceFiles.filter(p => !shouldExcludeFromSubsystems(p)),
    })).filter(s => s.sourceFiles.length > 0),
  };

  plan = dedupeSubsystemSourceFiles(plan);

  const usedFiles = new Set(plan.subsystems.map(s => s.file));
  const covered = new Set<string>();
  for (const s of plan.subsystems) {
    for (const p of s.sourceFiles) covered.add(p);
  }

  const missing = allPaths.filter(p => !covered.has(p));
  if (missing.length > 0) {
    const additions = groupPathsIntoAutoSubsystems(missing, scan, usedFiles, repairOpts);
    plan = { ...plan, subsystems: [...plan.subsystems, ...additions] };
  }

  plan = applyCanonicalGroupings(plan, repairOpts);
  return dedupeSubsystemSourceFiles(plan);
}

/** Maps `Config` subsystem layout fields into `repairBuildPlan` options. */
export function repairOptionsFromConfig(config: Config): RepairBuildPlanOptions {
  return {
    subsystemGrouping: config.subsystemGrouping,
    maxFilesPerFolderSubsystem: config.maxFilesPerFolderSubsystem,
    subsystemLayout: config.subsystemLayout,
  };
}
