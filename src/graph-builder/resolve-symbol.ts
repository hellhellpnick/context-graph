import fs from 'fs';
import path from 'path';
import type { BuildPlan } from './types';

export interface SymbolLookupRow {
  lookupKey: string;
  sourcePath: string;
  instructionFile: string;
  priority: string;
}

const SYMBOL_INDEX_REL = '.github/instructions/symbol-index.md';

/** Build basename / stem → instruction rows (for Q&A without open file). */
export function buildSymbolLookupRows(plan: BuildPlan): SymbolLookupRow[] {
  const rows: SymbolLookupRow[] = [];
  const seen = new Set<string>();

  const push = (lookupKey: string, sourcePath: string, instructionFile: string, priority: string) => {
    const norm = sourcePath.replace(/\\/g, '/');
    const key = lookupKey.trim();
    if (!key) return;
    const dedupe = `${key}\0${norm}\0${instructionFile}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    rows.push({ lookupKey: key, sourcePath: norm, instructionFile, priority });
  };

  for (const s of plan.subsystems) {
    for (const src of s.sourceFiles) {
      const norm = src.replace(/\\/g, '/');
      const base = path.posix.basename(norm);
      const stem = base.replace(/\.[^.]+$/, '');
      push(base, norm, s.file, s.priority);
      if (stem !== base) push(stem, norm, s.file, s.priority);
    }
  }

  return rows.sort(
    (a, b) =>
      a.lookupKey.localeCompare(b.lookupKey, undefined, { sensitivity: 'base' }) ||
      a.sourcePath.localeCompare(b.sourcePath)
  );
}

const SYMBOL_INDEX_CAP = 1200;

export function buildSymbolIndexMd(today: string, plan: BuildPlan): string {
  const all = buildSymbolLookupRows(plan);
  const capped = all.length > SYMBOL_INDEX_CAP;
  const rows = capped ? all.slice(0, SYMBOL_INDEX_CAP) : all;

  const table = rows.map(
    r =>
      `| \`${r.lookupKey}\` | \`${r.sourcePath}\` | \`${r.instructionFile}\` | ${r.priority} |`
  );

  return [
    `# context-graph — symbol lookup`,
    ``,
    `_Generated: ${today}. **Search here first** when the user names a file or component (e.g. \`LinkTag\`, \`useSeo\`) — before \`grep\` / \`Glob\`._`,
    ``,
    `| Lookup key | Source path | Instruction (under \`.github/instructions/\`) | P |`,
    `|---|---|---|---|`,
    ...table,
    ``,
    capped
      ? `_Truncated: ${all.length - rows.length} more row(s) — use [context-graph-path-index.md](context-graph-path-index.md)._`
      : `Companion: [context-graph-path-index.md](context-graph-path-index.md) · [index.md](index.md).`,
    ``,
  ].join('\n');
}

function parseSymbolIndexTable(md: string): SymbolLookupRow[] {
  const rows: SymbolLookupRow[] = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 6) continue;
    const lookupKey = cells[1]?.replace(/^`|`$/g, '') ?? '';
    const sourcePath = cells[2]?.replace(/^`|`$/g, '') ?? '';
    const instructionFile = cells[3]?.replace(/^`|`$/g, '') ?? '';
    const priority = cells[4] ?? 'P2';
    if (lookupKey === 'Lookup key' || lookupKey === '---') continue;
    rows.push({ lookupKey, sourcePath, instructionFile, priority });
  }
  return rows;
}

export function loadSymbolLookupRows(projectRoot: string): SymbolLookupRow[] {
  const p = path.join(projectRoot, SYMBOL_INDEX_REL);
  if (!fs.existsSync(p)) return [];
  return parseSymbolIndexTable(fs.readFileSync(p, 'utf8'));
}

/** Case-insensitive match on lookup key, basename, or source path. */
export function resolveSymbolQuery(
  projectRoot: string,
  query: string,
  rows?: SymbolLookupRow[]
): SymbolLookupRow[] {
  const list = rows ?? loadSymbolLookupRows(projectRoot);
  const q = query.trim().replace(/\\/g, '/');
  if (!q) return [];
  const qLower = q.toLowerCase();
  const base = path.posix.basename(q);
  const stem = base.replace(/\.[^.]+$/, '');
  const keys = new Set([q, base, stem, stem !== base ? stem : ''].filter(Boolean).map(k => k.toLowerCase()));

  return list.filter(r => {
    const lk = r.lookupKey.toLowerCase();
    const sp = r.sourcePath.toLowerCase();
    if (keys.has(lk)) return true;
    if (sp === qLower || sp.endsWith(`/${qLower}`)) return true;
    if (lk.includes(qLower) && qLower.length >= 4) return true;
    return false;
  });
}

export function formatResolveResult(
  projectRoot: string,
  query: string,
  matches: SymbolLookupRow[]
): string {
  if (matches.length === 0) {
    return [
      `No symbol-index match for "${query}".`,
      `Rebuild graph or search context-graph-path-index.md.`,
    ].join('\n');
  }
  const lines = [
    `# Resolve: ${query}`,
    ``,
    `Open instruction **before** repo grep:`,
    ``,
  ];
  for (const m of matches.slice(0, 12)) {
    const abs = path.join(projectRoot, '.github/instructions', m.instructionFile);
    lines.push(
      `- **${m.lookupKey}** → \`${m.sourcePath}\``,
      `  - instruction: \`.github/instructions/${m.instructionFile}\``,
      `  - ${fs.existsSync(abs) ? 'exists' : 'missing on disk'}`,
      `  - priority: ${m.priority}`,
      ``
    );
  }
  if (matches.length > 12) {
    lines.push(`_+${matches.length - 12} more — see symbol-index.md_`);
  }
  return lines.join('\n');
}
