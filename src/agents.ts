import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import type { ScanResult } from './scanner';
import type { BuildPlan } from './graph-builder';
import {
  AGENTS_CATALOG,
  MAX_RECOMMENDED_AGENTS,
  type AgentEntry,
  type AgentMatchRule,
} from './agents-catalog';

// ─── Matching ────────────────────────────────────────────────────────────────

interface MatchContext {
  extensions: Set<string>;
  filePaths: string[];
  dependencies: Set<string>;
  stackKeywords: Set<string>;
}

function buildMatchContext(scan: ScanResult, plan?: BuildPlan): MatchContext {
  const extensions = new Set<string>();
  const filePaths: string[] = [];
  const dependencies = new Set<string>();

  for (const f of scan.files) {
    const ext = path.posix.extname(f.path).toLowerCase();
    if (ext) extensions.add(ext);
    filePaths.push(f.path);
  }

  // Extract deps from package.json
  const pkgFile = scan.files.find(f => f.path === 'package.json' && f.content);
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (pkg[section] && typeof pkg[section] === 'object') {
          for (const dep of Object.keys(pkg[section])) {
            dependencies.add(dep.replace(/^@[^/]+\//, '').toLowerCase());
            dependencies.add(dep.toLowerCase());
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Extract deps from pyproject.toml / requirements.txt
  const reqFile = scan.files.find(f =>
    (f.path === 'requirements.txt' || f.path === 'pyproject.toml') && f.content
  );
  if (reqFile) {
    const lines = reqFile.content.split('\n');
    for (const line of lines) {
      const m = line.match(/^([a-zA-Z0-9_-]+)/);
      if (m) dependencies.add(m[1].toLowerCase());
    }
  }

  const stackKeywords = new Set<string>();
  if (plan?.techStack) {
    for (const t of plan.techStack) stackKeywords.add(t);
  }

  return { extensions, filePaths, dependencies, stackKeywords };
}

function scoreAgent(entry: AgentEntry, ctx: MatchContext): number {
  const rule = entry.match;
  let score = 0;

  if (rule.always) score += 1;

  if (rule.extensions) {
    const hits = rule.extensions.filter(e => ctx.extensions.has(e)).length;
    score += hits * 3;
  }

  if (rule.dependencies) {
    const hits = rule.dependencies.filter(d => ctx.dependencies.has(d.toLowerCase())).length;
    score += hits * 4;
  }

  if (rule.filePatterns) {
    for (const pat of rule.filePatterns) {
      if (ctx.filePaths.some(fp => pat.test(fp))) score += 2;
    }
  }

  if (rule.stackKeywords) {
    const hits = rule.stackKeywords.filter(k => ctx.stackKeywords.has(k)).length;
    score += hits * 2;
  }

  return score;
}

/**
 * Rank all catalog agents against the scanned project and return the top N.
 */
export function matchAgents(
  scan: ScanResult,
  plan?: BuildPlan,
  maxAgents = MAX_RECOMMENDED_AGENTS,
): AgentEntry[] {
  const ctx = buildMatchContext(scan, plan);

  const scored = AGENTS_CATALOG
    .map(entry => ({ entry, score: scoreAgent(entry, ctx) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxAgents).map(x => x.entry);
}

// ─── Fetching ────────────────────────────────────────────────────────────────

const RAW_BASE = 'https://raw.githubusercontent.com/msitarzewski/agency-agents/main';

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'context-graph' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) return fetchUrl(res.headers.location).then(resolve, reject);
        return reject(new Error(`Redirect without location: ${res.statusCode}`));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export interface FetchedAgent {
  slug: string;
  name: string;
  description: string;
  usage: string;
  category: string;
  content: string;
}

/**
 * Download agent .md files from the upstream repo.
 * Failures are logged but don't break the build.
 */
export async function fetchAgents(
  entries: AgentEntry[],
  onProgress?: (done: number, total: number, name: string) => void,
): Promise<FetchedAgent[]> {
  const results: FetchedAgent[] = [];
  let done = 0;

  for (const entry of entries) {
    const url = `${RAW_BASE}/${entry.repoPath}`;
    try {
      const content = await fetchUrl(url);
      results.push({
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        usage: entry.usage,
        category: entry.category,
        content,
      });
    } catch (err) {
      // Non-fatal: agent just won't be included
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`  ⚠ Could not fetch agent "${entry.name}": ${msg}\n`);
    }
    done++;
    onProgress?.(done, entries.length, entry.name);
  }

  return results;
}

// ─── Writing ─────────────────────────────────────────────────────────────────

export interface AgentsWriteResult {
  created: string[];
  updated: string[];
  readmePath: string;
}

/**
 * Write fetched agents to .github/agents/ and generate a README.
 */
export function writeAgents(
  agents: FetchedAgent[],
  projectRoot: string,
): AgentsWriteResult {
  const agentsDir = path.join(projectRoot, '.github', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  const created: string[] = [];
  const updated: string[] = [];

  for (const agent of agents) {
    const filePath = path.join(agentsDir, `${agent.slug}.md`);
    const relPath = `.github/agents/${agent.slug}.md`;
    const existed = fs.existsSync(filePath);
    fs.writeFileSync(filePath, agent.content, 'utf8');
    (existed ? updated : created).push(relPath);
  }

  const readmePath = path.join(agentsDir, 'README.md');
  const readme = generateAgentsReadme(agents);
  fs.writeFileSync(readmePath, readme, 'utf8');
  if (!created.includes('.github/agents/README.md') && !updated.includes('.github/agents/README.md')) {
    created.push('.github/agents/README.md');
  }

  return { created, updated, readmePath: '.github/agents/README.md' };
}

function generateAgentsReadme(agents: FetchedAgent[]): string {
  const byCategory = new Map<string, FetchedAgent[]>();
  for (const a of agents) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category)!.push(a);
  }

  const categoryLabels: Record<string, string> = {
    engineering: 'Engineering',
    testing: 'Testing & Review',
    design: 'Design',
    product: 'Product',
    support: 'Support',
    specialized: 'Specialized',
  };

  const lines: string[] = [
    '# Recommended AI Agents',
    '',
    '_Auto-generated by [context-graph](https://github.com/nickhellp/context-graph)._',
    '_Source: [agency-agents](https://github.com/msitarzewski/agency-agents)_',
    '',
    `These ${agents.length} agents were selected based on the project's tech stack, dependencies, and file structure.`,
    'Each `.md` file is a complete system prompt you can use with GitHub Copilot, Claude Code, Cursor, or any AI coding assistant.',
    '',
    '## How to Use',
    '',
    '### GitHub Copilot',
    'Agents in `.github/agents/` are automatically available. Reference them in chat:',
    '```',
    'Use the @frontend-developer agent to review this component.',
    '```',
    '',
    '### Cursor / Windsurf',
    'Copy desired agents to `.cursor/rules/` (Cursor) or `.windsurfrules/` (Windsurf):',
    '```bash',
    'cp .github/agents/frontend-developer.md .cursor/rules/  # Cursor',
    '```',
    '',
    '### JetBrains AI',
    'Open **Settings → Tools → AI Assistant → Prompt Library → Project** and paste the agent content.',
    '',
    '### Claude Code',
    'Copy desired agents to `CLAUDE.md` or reference inline:',
    '```bash',
    'cp .github/agents/frontend-developer.md ~/.claude/agents/  # Unix/macOS',
    '```',
    '',
    '---',
    '',
  ];

  const categoryOrder = ['engineering', 'testing', 'design', 'product', 'specialized', 'support'];
  for (const cat of categoryOrder) {
    const group = byCategory.get(cat);
    if (!group || group.length === 0) continue;
    lines.push(`## ${categoryLabels[cat] ?? cat}`);
    lines.push('');
    lines.push('| Agent | Description | When to Use |');
    lines.push('|-------|------------|-------------|');
    for (const a of group) {
      lines.push(`| [${a.name}](./${a.slug}.md) | ${a.description} | ${a.usage} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('To update agents, run: `npx context-graph agents`');
  lines.push('');

  return lines.join('\n');
}
