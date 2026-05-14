import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Git work tree root, or null if `cwd` is not inside a Git repository.
 */
export function tryGitRepositoryRoot(cwd: string): string | null {
  try {
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!out) return null;
    return path.resolve(out);
  } catch {
    return null;
  }
}

/**
 * Resolves where `.github/instructions/` and `.context-graph.json` live.
 *
 * - **Implicit cwd** (no CLI `[dir]`, or `dir` is `.` / same as `process.cwd()`):
 *   1. `CONTEXT_GRAPH_ROOT` if set and points to an existing directory
 *   2. else Git repository root from cwd (`git rev-parse --show-toplevel`)
 *   3. else `path.resolve(cwd)`
 * - **Explicit `[dir]`** (subfolder path): that path only — no Git uplift (monorepo package roots).
 */
export function resolveProjectRoot(cliDirArg: string | undefined, cwd: string = process.cwd()): string {
  const resolvedCwd = path.resolve(cwd);
  const start = cliDirArg ? path.resolve(cwd, cliDirArg) : resolvedCwd;
  const resolvedStart = path.resolve(start);

  const implicit =
    cliDirArg === undefined || cliDirArg === '.' || resolvedStart === resolvedCwd;

  if (implicit) {
    const env = process.env.CONTEXT_GRAPH_ROOT?.trim();
    if (env) {
      const fromEnv = path.isAbsolute(env) ? env : path.resolve(cwd, env);
      try {
        if (fs.existsSync(fromEnv) && fs.statSync(fromEnv).isDirectory()) {
          return path.resolve(fromEnv);
        }
      } catch {
        // ignore invalid env
      }
    }
    const gitRoot = tryGitRepositoryRoot(cwd);
    if (gitRoot) return gitRoot;
  }

  return resolvedStart;
}
