import path from 'path';
import readline from 'readline';
import chalk from 'chalk';

export interface CliOutputOpts {
  quiet?: boolean;
  json?: boolean;
}

export function createLoggers(opts: CliOutputOpts) {
  const quiet = opts.quiet ?? false;
  const jsonOutput = opts.json ?? false;
  const log = (...args: unknown[]) => {
    if (!quiet && !jsonOutput) console.log(...args);
  };
  return { quiet, jsonOutput, log };
}

export function logResolvedProjectRoot(
  log: (...args: unknown[]) => void,
  projectRoot: string,
  opts: CliOutputOpts
) {
  if (opts.quiet || opts.json) return;
  const cw = path.resolve(process.cwd());
  const pr = path.resolve(projectRoot);
  if (pr !== cw) {
    log(chalk.dim(`Project root: ${pr} (terminal cwd: ${cw})`));
  }
}

export function formatCost(costUSD: number | null, inputTokens: number, outputTokens: number): string {
  const tokenStr = `${Math.round(inputTokens / 1000)}k in / ${Math.round(outputTokens / 1000)}k out`;
  if (costUSD === null) return chalk.dim(` · ${tokenStr}`);
  return chalk.dim(` · ~$${costUSD.toFixed(3)} · ${tokenStr}`);
}

/** Pre-push hook only: avoid enquirer (Node 20+ can throw ERR_USE_AFTER_CLOSE on confirm). */
export async function promptHookRunActualize(): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  return new Promise<boolean>(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    const finish = (yes: boolean) => {
      try {
        rl.close();
      } catch {
        /* ignore */
      }
      setImmediate(() => resolve(yes));
    };
    rl.question(
      chalk.yellow('Run actualize now (optional — uses your configured LLM)? [y/N] '),
      answer => {
        finish(/^y(es)?$/i.test(String(answer ?? '').trim()));
      }
    );
  });
}
