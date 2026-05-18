import path from 'path';
import type { ScanResult } from '../../scanner';
import type { BuildPlan, BuildPlanItem } from '../types';
import type { ProjectStackProfile } from '../plan/stack-profile';
import { detectProjectStackProfile } from '../plan/stack-profile';
import { summarizeSubsystemDirGroups } from './root-slim';
import { buildAiToolRoutingReferenceSection, buildCopilotGraphMandate } from './routing-mandate';

const PATH_INDEX = '`.github/instructions/context-graph-path-index.md`';

export function buildHowToUseGraphSection(
  plan: BuildPlan,
  profile: ProjectStackProfile
): string[] {
  const n = plan.subsystems.length;
  const example = profile.nuxt
    ? '`frontend/dev/pages/index.vue` or `frontend/dev/composables/useSeo.js`'
    : profile.laravel
      ? '`app/Http/Controllers/API/FooController.php`'
      : 'the source path you edit';
  return [
    `## How to use this graph`,
    ``,
    ...buildCopilotGraphMandate(example),
    `Deterministic baseline (no LLM).`,
    ``,
    `1. Note the source file you edit (e.g. ${example}).`,
    `2. Open ${PATH_INDEX} and **search** that path (or basename).`,
    `3. Open the matching \`.github/instructions/**/*.instructions.md\` — frontmatter \`applyTo\` MUST match.`,
    `4. Read **Signatures**, **Dependencies**, **Graph** in that file; open repo source for bodies.`,
    `5. **Cursor:** \`.cursor/rules/ctxgraph--*.mdc\` attaches when \`globs\` match — follow that rule first.`,
    ``,
    `**${n}** subsystem instruction file(s). Root = map + zones; detail = per-path \`*.instructions.md\`.`,
    `**Priority:** if several files match, **MUST** use higher priority **P0 > P1 > P2** (column in path-index).`,
    ``,
    ...buildAiToolRoutingReferenceSection(),
  ];
}

export function buildCodeZonesSection(plan: BuildPlan, profile: ProjectStackProfile): string[] {
  const groups = summarizeSubsystemDirGroups(plan).slice(0, 16);
  const lines: string[] = [`## Code zones`, ``];

  if (profile.laravel) {
    lines.push(
      `| Zone | Look here | Instructions |`,
      `|------|-----------|--------------|`,
      `| HTTP API | \`app/Http/Controllers/**\` | path-index → \`applyTo\` |`,
      `| Form requests | \`app/Http/Requests/**\` | path-index |`,
      `| Middleware | \`app/Http/Middleware/**\` | path-index |`,
      `| Domain | \`app/Models/**\`, \`app/Services/**\` | path-index |`,
      `| Routes | \`routes/**\` | path-index |`,
      `| Config / env | \`config/**\`, \`.env\` | path-index + Danger Zones below |`,
      `| Console | \`app/Console/**\` | path-index |`,
      `| Tests | \`tests/**\` | path-index |`
    );
    if (profile.vue || profile.node) {
      lines.push(`| Frontend | \`resources/**\` | path-index |`);
    }
    lines.push(``);
  }

  if (profile.nuxt) {
    const root = profile.nuxtRoot ? `\`${profile.nuxtRoot}/\`` : 'app root';
    lines.push(
      `| Zone | Look here | Instructions |`,
      `|------|-----------|--------------|`,
      `| Pages / routes | ${root}\`pages/**\` | path-index → \`applyTo\` |`,
      `| Layouts | ${root}\`layouts/**\` | path-index |`,
      `| Composables | ${root}\`composables/**\` | path-index |`,
      `| Components | ${root}\`components/**\` | path-index |`,
      `| Server / API | ${root}\`server/**\` | path-index |`,
      `| Config | \`nuxt.config.*\`, \`package.json\` in ${root} | path-index + Danger Zones |`
    );
    lines.push(``);
  }

  if (groups.length > 0) {
    lines.push(`**Directory groups** (from ${plan.subsystems.length} instruction files):`);
    for (const g of groups.slice(0, 12)) {
      const glob = g.dir === '.' ? '* (root)' : `\`${g.dir}/**\``;
      lines.push(
        `- ${glob} — ${g.subsystemCount} instruction file(s), ${g.sourceFileCount} source(s), best **${g.bestPriority}**`
      );
    }
    if (groups.length > 12) {
      lines.push(`- _… see ${PATH_INDEX} for full tree._`);
    }
  }

  return lines;
}

export function buildProjectDataFlowSection(
  scan: ScanResult,
  profile: ProjectStackProfile
): string[] {
  const lines: string[] = [`## Request / app flow`, ``];

  if (profile.laravel) {
    const routeFiles = scan.files
      .map(f => f.path.replace(/\\/g, '/'))
      .filter(p => /^routes\/.*\.php$/i.test(p))
      .sort();
    const routeShown = routeFiles.slice(0, 8);
    const routeOmitted = routeFiles.length - routeShown.length;
    lines.push(
      `- **HTTP:** \`public/index.php\` → Laravel kernel → \`routes/*.php\` → middleware → controller → services/models → response (JSON/resources).`,
      routeShown.length > 0
        ? `- **Route files:** ${routeShown.map(r => `\`${r}\``).join(', ')}` +
          (routeOmitted > 0 ? ` _(+${routeOmitted} more under routes/)_` : '') +
          '.'
        : `- **Route files:** \`routes/**\` (search repo).`,
      `- **API layer:** \`app/Http/Controllers/**\` + \`app/Http/Requests/**\` — see matching \`*.instructions.md\`.`,
      `- **CLI:** \`artisan\` → \`app/Console/Commands/**\`.`
    );
    if (profile.node) {
      lines.push(
        `- **Frontend (separate):** \`resources/assets/**\` — SPA build via npm; not the PHP request path.`
      );
    }
    return lines;
  }

  if (profile.nuxt) {
    const root = profile.nuxtRoot ? `${profile.nuxtRoot}/` : '';
    const pkg = scan.files.find(f => f.path === `${root}package.json`.replace(/^\//, '') && f.content);
    const nuxtCfg = scan.files.find(f =>
      /nuxt\.config\.(ts|js|mjs)$/i.test(f.path.replace(/\\/g, '/'))
    );
    lines.push(
      `- **Web:** \`${root}pages/**\` → \`${root}composables/**\` / \`${root}components/**\` → \`${root}server/**\` or API.`,
      nuxtCfg
        ? `- **Nuxt config:** \`${nuxtCfg.path.replace(/\\/g, '/')}\`.`
        : `- **Nuxt config:** \`nuxt.config.*\` under ${root || 'repo root'}.`,
      pkg
        ? `- **Scripts:** \`${root}package.json\` (build/dev/test).`
        : `- **Scripts:** see \`package.json\` in ${root || 'repo root'}.`
    );
    return lines;
  }

  const entry = scan.files
    .filter(f => f.tier === 1 && f.content)
    .map(f => f.path.replace(/\\/g, '/'))
    .sort()
    .slice(0, 8);
  lines.push(
    entry.length > 0
      ? `- **Entry / seed files:** ${entry.map(p => `\`${p}\``).join(', ')}.`
      : `- **Entry files:** search path-index for tier-1 paths.`,
    `- Trace imports/callers in the subsystem \`*.instructions.md\` for the file you edit.`
  );
  return lines;
}

export interface NavZonePick {
  zone: string;
  subsystem: BuildPlanItem;
}

const NUXT_NAV_ZONES: Array<{ zone: string; pathTest: (p: string) => boolean }> = [
  { zone: 'Pages', pathTest: p => /\/pages\/[^/]+\.(vue|js|ts|tsx|jsx)$/i.test(p) || /\/pages\/index\./i.test(p) },
  { zone: 'Layouts', pathTest: p => /\/layouts?\//i.test(p) },
  { zone: 'Composables', pathTest: p => /\/composables?\//i.test(p) },
  { zone: 'Components', pathTest: p => /\/components\//i.test(p) && /\.(vue|js|ts)$/i.test(p) },
  { zone: 'Server', pathTest: p => /\/server\//i.test(p) },
];

const LARAVEL_NAV_ZONES: Array<{ zone: string; pathTest: (p: string) => boolean }> = [
  { zone: 'API controllers', pathTest: p => p.includes('app/Http/Controllers/API') },
  { zone: 'Controllers', pathTest: p => p.includes('app/Http/Controllers') },
  { zone: 'HTTP requests', pathTest: p => p.includes('app/Http/Requests') },
  { zone: 'Middleware', pathTest: p => p.includes('app/Http/Middleware') },
  { zone: 'Services', pathTest: p => p.startsWith('app/Services/') },
  { zone: 'Models', pathTest: p => p.startsWith('app/Models/') },
  { zone: 'Routes', pathTest: p => p.startsWith('routes/') },
  { zone: 'Config', pathTest: p => p.startsWith('config/') },
];

function isLaravelBackendPath(p: string): boolean {
  const n = p.replace(/\\/g, '/');
  return (
    /^(app|routes|config|database|bootstrap)\//.test(n) ||
    n === 'public/index.php' ||
    n === 'artisan'
  );
}

function subsystemMatchesZone(s: BuildPlanItem, pathTest: (p: string) => boolean): boolean {
  return s.sourceFiles.some(f => pathTest(f.replace(/\\/g, '/')));
}

function formatNavLine(s: BuildPlanItem): string {
  const sample = s.sourceFiles[0]?.replace(/\\/g, '/') ?? '?';
  return `- **${s.area}** [${s.priority}] → \`${s.file}\` — \`${sample}\``;
}

/** Zone-aware highlights for slim root (Laravel API first, not random P0 Vue). */
export function pickZoneNavigationHighlights(
  plan: BuildPlan,
  profile: ProjectStackProfile,
  maxTotal: number
): string[] {
  const lines: string[] = [];
  const usedFiles = new Set<string>();
  let bulletCount = 0;

  const tryPick = (s: BuildPlanItem) => {
    if (usedFiles.has(s.file) || bulletCount >= maxTotal) return;
    usedFiles.add(s.file);
    lines.push(formatNavLine(s));
    bulletCount++;
  };

  if (profile.laravel) {
    lines.push(`### Key zones (Laravel)`, ``);
    for (const z of LARAVEL_NAV_ZONES) {
      if (bulletCount >= Math.min(8, maxTotal)) break;
      const match = plan.subsystems.find(s => subsystemMatchesZone(s, z.pathTest));
      if (match) tryPick(match);
    }
    if (bulletCount > 0) lines.push(``);
  }

  if (profile.nuxt) {
    lines.push(`### Key zones (Nuxt)`, ``);
    for (const z of NUXT_NAV_ZONES) {
      if (bulletCount >= Math.min(10, maxTotal)) break;
      const match = plan.subsystems.find(s => subsystemMatchesZone(s, z.pathTest));
      if (match) tryPick(match);
    }
    if (bulletCount > 0) lines.push(``);
  }

  const remaining = maxTotal - bulletCount;
  if (remaining > 0) {
    lines.push(`### More P0 / P1`);
    const PRI = { P0: 0, P1: 1, P2: 2 };
    const sorted = [...plan.subsystems].sort(
      (a, b) => PRI[a.priority] - PRI[b.priority] || a.file.localeCompare(b.file)
    );
    for (const s of sorted) {
      if (bulletCount >= maxTotal) break;
      if (s.priority === 'P2') continue;
      if (usedFiles.has(s.file)) continue;
      if (profile.laravel && !s.sourceFiles.some(f => isLaravelBackendPath(f))) continue;
      if (
        profile.laravel &&
        s.sourceFiles.some(p => /^(resources\/|docs\/\.vitepress)/.test(p.replace(/\\/g, '/')))
      ) {
        continue;
      }
      if (profile.nuxt && s.sourceFiles.every(f => /\.husky\//i.test(f.replace(/\\/g, '/')))) {
        continue;
      }
      tryPick(s);
    }
  }

  return lines;
}

export function getProjectStackProfile(scan: ScanResult): ProjectStackProfile {
  return detectProjectStackProfile(scan);
}
