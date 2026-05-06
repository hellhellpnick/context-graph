import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';

export interface ScannedFile {
  path: string;
  tier: 0 | 1 | 2 | 3;
  content: string;
  lines: number;
  truncated: boolean;
}

export interface ScanResult {
  tree: string;
  files: ScannedFile[];
  tokenEstimate: number;
  fileCount: number;
  skippedCount: number;
}

// ── Tier 3: always skip ────────────────────────────────────────────────────

const TIER3_DIRS = new Set([
  'node_modules', 'dist', 'build', 'target', 'bin', '.gradle',
  '__pycache__', '.venv', 'venv', 'vendor', '.git', 'coverage',
  '.nyc_output', 'generated', '__generated__', '.turbo', '.next',
  '.nuxt', 'out', '.output',
]);

const TIER3_FILE_RE = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /Cargo\.lock$/,
  /go\.sum$/,
  /Gemfile\.lock$/,
  /composer\.lock$/,
  /poetry\.lock$/,
  /uv\.lock$/,
  /\.lock$/,
  /\.min\.(js|css)$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|pdf|zip|tar|gz|bin|exe)$/i,
  /\.gen\.(ts|js|go|py|cs|java|kt|rb|php)$/,
  /\.d\.ts$/,
];

// ── Tier 0: infra/CI ──────────────────────────────────────────────────────

const TIER0_RE = [
  /^\.github\/workflows\/.+\.ya?ml$/,
  /^\.gitlab-ci\.ya?ml$/,
  /^Jenkinsfile$/,
  /^\.circleci\/config\.ya?ml$/,
  /^Dockerfile(\..*)?$/,
  /^docker-compose.*\.ya?ml$/,
  /^Makefile$/,
  /^Taskfile\.ya?ml$/,
  /^justfile$/,
  /^Procfile$/,
  /^\.env\.example$/,
  /^\.env\.schema$/,
  /^serverless\.ya?ml$/,
  /^fly\.toml$/,
  /^render\.ya?ml$/,
  /^\.copilotignore$/,
];

// ── Tier 1: entry points & root configs ───────────────────────────────────

const TIER1_NAMES = new Set([
  'index.ts', 'index.js', 'index.mts', 'index.mjs',
  'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js',
  'main.py', 'app.py', '__main__.py', 'manage.py', 'wsgi.py', 'asgi.py',
  'main.go', 'main.rs', 'lib.rs',
  'Program.cs', 'Startup.cs',
  'package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml',
  'pom.xml', 'build.gradle', 'build.gradle.kts', 'Gemfile',
  'schema.prisma',
  'openapi.yaml', 'openapi.yml', 'swagger.json', 'swagger.yaml',
]);

const TIER1_RE = [
  /^src\/(main|index|app|server)\.(ts|js|mts|mjs|py|go|rs)$/,
  /^(main|index|app|server)\.(ts|js|mts|mjs|py|go|rs)$/,
  /\/models\.(py|ts)$/,
  /\/models\/index\.(ts|js)$/,
  /.*Application\.(java|kt)$/,
  /^cmd\/.+\/main\.go$/,
];

export function classifyFile(relPath: string): 0 | 1 | 2 | 3 {
  const normalized = relPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const name = parts[parts.length - 1];

  if (parts.some(p => TIER3_DIRS.has(p))) return 3;
  if (TIER3_FILE_RE.some(r => r.test(name))) return 3;
  if (TIER0_RE.some(r => r.test(normalized))) return 0;
  if (TIER1_NAMES.has(name)) return 1;
  if (TIER1_RE.some(r => r.test(normalized))) return 1;
  return 2;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildTree(files: ScannedFile[]): string {
  return files
    .filter(f => f.tier !== 3)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(f => {
      const label = f.tier === 0 ? '[T0:infra]' : f.tier === 1 ? '[T1:core]' : '[T2]';
      return `${f.path} ${label}`;
    })
    .join('\n');
}

export async function scanProject(
  projectRoot: string,
  maxFiles = 200,
  maxInputTokens = 80000,
  options?: { unlimited?: boolean }
): Promise<ScanResult> {
  const unlimited = options?.unlimited ?? false;
  const ig = ignore();
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, 'utf8'));
  }
  const copilotIgnorePath = path.join(projectRoot, '.copilotignore');
  if (fs.existsSync(copilotIgnorePath)) {
    ig.add(fs.readFileSync(copilotIgnorePath, 'utf8'));
  }

  const allFiles = await glob('**/*', {
    cwd: projectRoot,
    nodir: true,
    dot: true,
    ignore: ['**/.git/**'],
  });

  const classified: ScannedFile[] = allFiles
    .filter(f => !ig.ignores(f))
    .map(f => ({ path: f, tier: classifyFile(f), content: '', lines: 0, truncated: false }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.path.localeCompare(b.path);
    });

  let tokenBudget = maxInputTokens;
  let fileCount = 0;
  let skippedCount = 0;
  const result: ScannedFile[] = [];

  for (const file of classified) {
    if (file.tier === 3) {
      skippedCount++;
      result.push(file);
      continue;
    }

    if (!unlimited && fileCount >= maxFiles) {
      skippedCount++;
      result.push({ ...file, truncated: true });
      continue;
    }

    const fullPath = path.join(projectRoot, file.path);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const allLines = raw.split('\n');
      file.lines = allLines.length;

      let content: string;
      let truncated = false;

      if (!unlimited && file.tier === 2) {
        content = allLines.slice(0, 30).join('\n');
        if (allLines.length > 30) truncated = true;
      } else {
        content = raw;
      }

      const tokens = estimateTokens(content);

      if (!unlimited && tokens > tokenBudget && file.tier !== 0) {
        if (file.tier === 1 && tokenBudget > 1000) {
          // Truncate large Tier 1 files if they exceed the remaining budget
          content = content.slice(0, tokenBudget * 4);
          truncated = true;
          tokenBudget = 0;
        } else {
          skippedCount++;
          result.push({ ...file, truncated: true });
          continue;
        }
      } else {
        tokenBudget -= tokens;
      }

      result.push({ ...file, content, truncated });
      fileCount++;
    } catch {
      // Binary or unreadable — skip
      skippedCount++;
      result.push({ ...file, tier: 3 });
    }
  }

  return {
    tree: buildTree(result),
    files: result,
    tokenEstimate: maxInputTokens - tokenBudget,
    fileCount,
    skippedCount,
  };
}

export function formatForLLM(scan: ScanResult): string {
  const parts: string[] = ['## Project File Tree\n', scan.tree, '\n'];

  const tier0 = scan.files.filter(f => f.tier === 0 && f.content);
  if (tier0.length > 0) {
    parts.push('\n## Tier 0: Infrastructure & Environment\n');
    for (const f of tier0) {
      parts.push(`\n### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``);
      if (f.truncated) parts.push('\n[... truncated ...]');
    }
  }

  const tier1 = scan.files.filter(f => f.tier === 1 && f.content);
  if (tier1.length > 0) {
    parts.push('\n\n## Tier 1: Entry Points & Core Config\n');
    for (const f of tier1) {
      parts.push(`\n### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``);
      if (f.truncated) parts.push('\n[... truncated due to token budget ...]');
    }
  }

  const tier2 = scan.files.filter(f => f.tier === 2 && f.content);
  if (tier2.length > 0) {
    parts.push('\n\n## Tier 2: Surface Only (first 30 lines each)\n');
    for (const f of tier2) {
      parts.push(`\n### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``);
      if (f.truncated && f.lines > 30) parts.push(`\n[... ${f.lines - 30} more lines ...]`);
    }
  }

  const skipped = scan.files.filter(f => f.tier === 3 || (f.truncated && !f.content));
  if (skipped.length > 0) {
    parts.push('\n\n## Tier 3: Skipped (names only)\n');
    const names = skipped.slice(0, 50).map(f => f.path).join('\n');
    parts.push(names);
    if (skipped.length > 50) parts.push(`\n... and ${skipped.length - 50} more`);
  }

  return parts.join('');
}

/** Line caps for `slim` — reduces prompt size for local/small models while keeping enough for quality output. */
const SLIM_LINES_TIER0 = 200;
const SLIM_LINES_TIER1 = 350;
const SLIM_LINES_TIER2 = 150;

/**
 * Returns a shallow copy of the scan with long file bodies truncated for LLM prompts.
 * Tier 0–2 only; Tier 3 unchanged. Does not replace full scan for `repairBuildPlan` / `buildMetadataJson`.
 */
export function scanForPromptDepth(scan: ScanResult, depth: 'full' | 'slim'): ScanResult {
  if (depth === 'full') return scan;

  const files = scan.files.map(f => {
    if (f.tier === 3 || !f.content) return f;
    const lines = f.content.split('\n');
    let maxLines = Infinity;
    if (f.tier === 0) maxLines = SLIM_LINES_TIER0;
    else if (f.tier === 1) maxLines = SLIM_LINES_TIER1;
    else maxLines = SLIM_LINES_TIER2;
    if (lines.length <= maxLines) return f;
    return {
      ...f,
      content: lines.slice(0, maxLines).join('\n'),
      truncated: true,
    };
  });

  return { ...scan, files };
}
