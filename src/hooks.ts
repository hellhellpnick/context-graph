import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { classifyFile } from './scanner';

const HOOK_MARKER = '# managed-by: context-graph';

const HOOK_SCRIPT = `#!/bin/sh
${HOOK_MARKER}
GRAPH_DIR=".github/instructions"

if [ ! -d "$GRAPH_DIR" ]; then
  exit 0
fi

if [ -f "./node_modules/.bin/context-graph" ] || [ -f "./node_modules/.bin/context-graph.cmd" ]; then
  CGX="./node_modules/.bin/context-graph"
elif command -v context-graph >/dev/null 2>&1; then
  CGX="context-graph"
else
  CGX="npx context-graph"
fi

$CGX hook-check
exit 0
`;

export function installPrePushHook(projectRoot: string): 'installed' | 'updated' | 'skipped' {
  const hooksDir = path.join(projectRoot, '.git', 'hooks');
  if (!fs.existsSync(hooksDir)) return 'skipped';

  const hookPath = path.join(hooksDir, 'pre-push');

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes(HOOK_MARKER)) return 'skipped'; // already managed by us

    // Append our block to existing user hook
    fs.writeFileSync(hookPath, `${existing.trimEnd()}\n\n${HOOK_SCRIPT}`);
    fs.chmodSync(hookPath, '755');
    return 'updated';
  }

  fs.writeFileSync(hookPath, HOOK_SCRIPT);
  fs.chmodSync(hookPath, '755');
  return 'installed';
}

export function saveLastBuildRef(projectRoot: string): void {
  const refFile = path.join(projectRoot, '.context-graph-last-build');
  try {
    const sha = execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    fs.writeFileSync(refFile, sha);
  } catch {
    fs.writeFileSync(refFile, new Date().toISOString());
  }
}

export function getChangedFilesSinceLastBuild(projectRoot: string): string[] {
  const refFile = path.join(projectRoot, '.context-graph-last-build');
  if (!fs.existsSync(refFile)) return [];

  const ref = fs.readFileSync(refFile, 'utf8').trim();

  try {
    let output: string;
    if (/^[0-9a-f]{40}$/.test(ref)) {
      output = execFileSync('git', ['diff', '--name-only', ref, 'HEAD'], {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } else if (/^\d{4}-\d{2}-\d{2}T[\d:.Z+-]+$/.test(ref)) {
      output = execFileSync('git', ['log', '--name-only', '--pretty=format:', `--since=${ref}`], {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } else {
      return [];
    }
    return [...new Set(output.trim().split('\n').filter(Boolean))];
  } catch {
    return [];
  }
}

export function filterSignificantFiles(files: string[]): string[] {
  return files.filter(f => {
    const tier = classifyFile(f);
    return tier === 0 || tier === 1 || tier === 2;
  });
}
