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

/** Common mistake: `context-graph build hybrid` instead of `build --hybrid`. */
const BUILD_MODE_DIR_ALIASES = new Set([
  'hybrid',
  'llm',
  'deterministic',
  'no-llm',
  'no_llm',
  'nollm',
  'offline',
]);

export type MistakenBuildModeFlag = 'hybrid' | 'deterministic' | 'llm';

export interface BuildDirNormalization {
  projectDir: string | undefined;
  mistakenModeFlag?: MistakenBuildModeFlag;
}

/**
 * If `[dir]` is actually a build-mode token (`hybrid`, `no-llm`, …), treat as implicit repo root.
 */
export function normalizeBuildDirArg(cliDirArg: string | undefined): BuildDirNormalization {
  if (!cliDirArg) return { projectDir: undefined };
  const key = cliDirArg.toLowerCase().replace(/_/g, '-');
  if (!BUILD_MODE_DIR_ALIASES.has(key)) return { projectDir: cliDirArg };
  if (key === 'hybrid') return { projectDir: undefined, mistakenModeFlag: 'hybrid' };
  if (key === 'llm') return { projectDir: undefined, mistakenModeFlag: 'llm' };
  return { projectDir: undefined, mistakenModeFlag: 'deterministic' };
}

export function suggestedBuildFlagForMistake(flag: MistakenBuildModeFlag): string {
  if (flag === 'deterministic') return '--no-llm';
  return `--${flag}`;
}

/** Exit-friendly check before writing `.context-graph.json` / instructions. */
export function assertProjectRootExists(projectRoot: string): void {
  let st: fs.Stats;
  try {
    st = fs.statSync(projectRoot);
  } catch {
    throw new Error(
      `Project directory does not exist: ${projectRoot}\n` +
        `Pass a real path: context-graph build [dir], or run from the repo root.`
    );
  }
  if (!st.isDirectory()) {
    throw new Error(`Project path is not a directory: ${projectRoot}`);
  }
}
