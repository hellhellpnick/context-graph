import path from 'path';
import type { ScanResult } from '../../scanner';
import { isComposableLikePath, isMessageOrPromptPath } from '../../source-extract';

export type InstructionPriority = 'P0' | 'P1' | 'P2';

const RANK: Record<InstructionPriority, number> = { P0: 0, P1: 1, P2: 2 };

/** Higher urgency wins (P0 > P1 > P2). */
export function maxPriority(a: InstructionPriority, b: InstructionPriority): InstructionPriority {
  return RANK[a] <= RANK[b] ? a : b;
}

/**
 * Heuristic priority for a single source file (deterministic / metadata).
 * Aligns with planning prompt: P0 entry & critical paths, P1 frequent, P2 leaf/rare.
 */
export function inferFilePriority(
  relPath: string,
  opts?: { tier?: number; lines?: number; content?: string }
): InstructionPriority {
  const norm = relPath.replace(/\\/g, '/');
  const base = path.posix.basename(norm);
  const lines = opts?.lines ?? (opts?.content ? opts.content.split('\n').length : 0);
  const tier = opts?.tier;
  const content = opts?.content ?? '';

  if (isMessageOrPromptPath(norm)) return 'P2';

  // Scanner tiers: T1 = entry/config, T0 = infra/CI
  if (tier === 1) {
    if (/^(package|composer)\.json$|pyproject\.toml$|^go\.mod$|^Cargo\.toml$/i.test(base)) return 'P1';
    return 'P0';
  }
  if (tier === 0) return 'P1';

  // Routes & app shells (Nuxt / Next / similar)
  if (/(?:^|\/)pages\/[^/]+\.(vue|tsx|jsx|ts|js)$/i.test(norm)) return 'P0';
  if (/(?:^|\/)app\/.*\/(page|layout|route)\.(vue|tsx|jsx|ts|js)$/i.test(norm)) return 'P0';
  if (/(?:^|\/)layouts?\//i.test(norm) && /\.(vue|tsx|jsx)$/i.test(norm)) return 'P1';

  // State & data fetching
  if (isComposableLikePath(norm)) return 'P0';
  if (/(?:^|\/)composables?\//i.test(norm)) return 'P0';
  if (/(?:^|\/)stores?\//i.test(norm)) return 'P1';
  if (/(?:^|\/)middleware\//i.test(norm)) return 'P1';
  if (/(?:^|\/)plugins?\//i.test(norm) && /\.(ts|js|mjs)$/i.test(norm)) return 'P1';

  // CLI / commands / package entry
  if (/(?:^|\/)cli\.(ts|js|mjs)$/i.test(norm)) return 'P0';
  if (/(?:^|\/)cmd\//i.test(norm)) return 'P0';
  if (/(?:^|\/)(?:bin|scripts)\//i.test(norm) && /\.(ts|js|mjs|sh)$/i.test(norm)) return 'P1';

  // Typical TS/JS package layout (context-graph, Node libs, monorepos)
  if (/^src\/project-root\.ts$/i.test(norm)) return 'P1';
  if (/^src\/(scanner|config|index)\.(ts|js|mts|mjs)$/i.test(norm)) return 'P0';
  if (/^src\/(graph-builder|writer|cli)\.(ts|js)$/i.test(norm)) return 'P0';
  if (/^src\/graph-builder\//i.test(norm)) return 'P1';
  if (/^src\/cli\//i.test(norm)) return 'P1';
  if (/^src\/providers\//i.test(norm)) return 'P1';
  if (/^src\/(hooks|agents|scanner)\./i.test(norm)) return 'P1';

  // API / server
  if (/(?:^|\/)server\/(?:api|routes|middleware)/i.test(norm)) return 'P1';
  if (/(?:^|\/)api\//i.test(norm) && /\.(ts|js|py|go|php)$/i.test(norm)) return 'P1';

  // PHP / Python entry-ish
  if (/^public\/index\.php$/i.test(norm)) return 'P0';
  if (/^(manage|wsgi|asgi)\.py$/i.test(base)) return 'P0';

  // Vue / UI
  if (/\.vue$/i.test(norm)) {
    if (lines > 200 || /createError|useAsyncPageData|useFetch|definePageMeta/.test(content)) return 'P1';
    if (lines > 80) return 'P1';
    return 'P2';
  }

  if (/\.(tsx|jsx)$/i.test(norm) && /(?:^|\/)components?\//i.test(norm) && lines > 150) return 'P1';

  // Tests & generated / low-signal
  if (/(?:^|\/)(?:tests?|__tests__|e2e|spec)\//i.test(norm)) return 'P2';
  if (/(?:^|\/)__(generated|mocks?)__\//i.test(norm)) return 'P2';
  if (/\.(snap|lock)$/i.test(norm)) return 'P2';

  if (lines > 450) return 'P1';
  if (lines > 220) return 'P2';

  return 'P2';
}

/** Subsystem priority = most urgent file in the chunk (mirror bundle or folder group). */
export function inferSubsystemPriority(sourceFiles: string[], scan?: ScanResult): InstructionPriority {
  if (sourceFiles.length === 0) return 'P2';

  let best: InstructionPriority = 'P2';
  for (const sf of sourceFiles) {
    const scanned = scan?.files.find(f => f.path === sf);
    const p = inferFilePriority(sf, {
      tier: scanned?.tier,
      lines: scanned?.lines,
      content: scanned?.content,
    });
    best = maxPriority(best, p);
  }

  if (sourceFiles.length === 1) return best;

  const dirs = new Set(
    sourceFiles.map(p => (p.includes('/') ? path.posix.dirname(p) : '.'))
  );
  if (dirs.size === 1) {
    const d = [...dirs][0]!;
    if (/^(?:src|lib|app|frontend|backend)(?:\/|$)/.test(d) && sourceFiles.length >= 2) {
      best = maxPriority(best, 'P1');
    }
  }

  return best;
}
