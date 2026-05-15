import crypto from 'crypto';
import path from 'path';
import type { ScanResult } from '../../scanner';
import type { BuildPlan, BuildPlanItem, RepairBuildPlanOptions } from '../types';
import {
  DIR_TO_INSTRUCTION_PREFIX,
  MAX_FILES_PER_FOLDER_SUBSYSTEM_DEFAULT,
  MAX_MIRROR_INSTRUCTION_REL_LEN,
  MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_DEFAULT,
  SPLIT_DIRS,
} from '../constants';
import { needsOwnInstructionFile } from '../../framework-extract';

export function humanAreaName(segment: string): string {
  let name = segment
    .replace(/\.[^.]+$/, '')           // strip extension
    .replace(/^__(.+)__$/, '$1')       // __init__ → init
    .replace(/[-_]+/g, ' ')           // delimiters → spaces
    .trim();
  if (!name || name === 'init') {
    // For __init__.py, use parent directory name instead
    return 'Module Entry';
  }
  return name.replace(/\b\w/g, c => c.toUpperCase()); // title case
}

export function shortHash(s: string): string {
  return crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 10);
}

/** Copilot prompts expect several concrete use cases; pad short auto-generated lists. */
export function padUseCases(cases: string[]): string[] {
  const out = [...cases];
  const pad = 'navigating this subsystem from the instruction index';
  while (out.length < 4) out.push(pad);
  return out.slice(0, 6);
}

export function autoInstructionStem(dir: string, files: string[], partIndex: number): string {
  // Single file → use its basename (e.g. core/scanner.instructions.md)
  if (files.length === 1) {
    const base = path.posix.basename(files[0]).replace(/\.[^.]+$/, '');
    const prefix = DIR_TO_INSTRUCTION_PREFIX[dir] ?? dir.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    return `${prefix}/${base}`;
  }
  const prefix = DIR_TO_INSTRUCTION_PREFIX[dir] ?? dir.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const stem = `${prefix}/bundle_p${partIndex}`;
  if (stem.length <= 120) return stem;
  return `auto/h${shortHash(dir + ':' + partIndex)}`;
}

export function mirrorInstructionSafeSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '') || 'x';
}

/** Instruction `.md` path under `.github/instructions/` mirroring source layout. */
export function mirrorInstructionRelPath(
  dir: string,
  chunk: string[],
  partIndex: number,
  totalParts: number,
  usedInstructionRelPaths: Set<string>
): string {
  const alloc = (relRel: string): string => {
    let rel = relRel.replace(/\\/g, '/');
    if (rel.split('/').some(p => p === '..')) {
      rel = `mirror/_bad_${shortHash(relRel)}.instructions.md`;
    }
    if (rel.length > MAX_MIRROR_INSTRUCTION_REL_LEN) {
      rel = `mirror/h${shortHash(dir + ':' + chunk.join(',') + ':' + partIndex)}.instructions.md`;
    }
    let unique = rel;
    let n = 0;
    while (usedInstructionRelPaths.has(unique)) {
      n++;
      unique = rel.replace(/\.instructions\.md$/, `._${n}.instructions.md`);
    }
    usedInstructionRelPaths.add(unique);
    return unique;
  };

  if (chunk.length === 1) {
    const f = chunk[0];
    const ext = path.posix.extname(f);
    const base = mirrorInstructionSafeSegment(path.posix.basename(f, ext));
    const d = path.posix.dirname(f);
    const rel = d === '.' ? `${base}.instructions.md` : `${d}/${base}.instructions.md`;
    return alloc(rel);
  }

  const safeDir = dir === '.' ? 'root' : dir;
  const bundleName =
    totalParts <= 1
      ? '_bundle.instructions.md'
      : partIndex === 1
        ? '_bundle.instructions.md'
        : `_bundle_p${partIndex}.instructions.md`;
  const rel = safeDir === 'root' ? `root/${bundleName}` : `${safeDir}/${bundleName}`;
  return alloc(rel);
}

/** Stable instruction path for by-folder grouping (avoids collisions across dirs). */
export function folderInstructionRelPath(
  dir: string,
  partIndex: number,
  totalParts: number,
  chunk: string[],
  usedInstructionRelPaths: Set<string>
): string {
  const first = dir === '.' ? 'root' : dir.split('/')[0];
  const mapped = DIR_TO_INSTRUCTION_PREFIX[first] ?? first.replace(/[^a-zA-Z0-9]+/g, '_');
  const slug = (dir === '.' ? 'root' : dir)
    .replace(/\//g, '__')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 72) || 'dir';
  const part = totalParts > 1 ? `_p${partIndex}` : '';
  let rel = `${mapped}/${slug}${part}.instructions.md`;
  while (usedInstructionRelPaths.has(rel)) {
    rel = `auto/${shortHash(rel + chunk.join(','))}.instructions.md`;
  }
  usedInstructionRelPaths.add(rel);
  return rel;
}


export function partitionInstructionChunks(
  list: string[],
  scan: ScanResult,
  maxBundle: number
): string[][] {
  const chunks: string[][] = [];
  let batch: string[] = [];

  const flushBatch = () => {
    if (batch.length === 0) return;
    for (let i = 0; i < batch.length; i += maxBundle) {
      chunks.push(batch.slice(i, i + maxBundle));
    }
    batch = [];
  };

  for (const p of list) {
    const scanned = scan.files.find(f => f.path === p);
    const content = scanned?.content ?? '';
    const lines = scanned?.lines;

    if (needsOwnInstructionFile(p, content, lines)) {
      flushBatch();
      chunks.push([p]);
    } else {
      batch.push(p);
    }
  }
  flushBatch();
  return chunks;
}
