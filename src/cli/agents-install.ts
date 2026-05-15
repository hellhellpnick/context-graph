import chalk from 'chalk';
import ora from 'ora';
import type { BuildPlan } from '../graph-builder';
import type { ScanResult } from '../scanner';
import { matchAgents, fetchAgents, writeAgents } from '../agents';

export async function installRecommendedAgents(
  scan: ScanResult,
  plan: BuildPlan | null | undefined,
  projectRoot: string,
  opts: {
    quiet: boolean;
    jsonOutput: boolean;
    dryRun?: boolean;
    log: (...args: unknown[]) => void;
  }
): Promise<void> {
  const { quiet, jsonOutput, dryRun, log } = opts;
  const matched = matchAgents(scan, plan ?? undefined);
  if (matched.length === 0 || dryRun) return;

  const agentSpinner = quiet || jsonOutput ? null : ora(`Fetching ${matched.length} recommended agents...`).start();

  try {
    const fetched = await fetchAgents(matched, (done, total, name) => {
      if (agentSpinner) agentSpinner.text = `Fetching agents (${done}/${total}): ${name}`;
    });
    if (fetched.length > 0) {
      const agentResult = writeAgents(fetched, projectRoot);
      agentSpinner?.succeed(`${fetched.length} agents installed in .github/agents/`);
      for (const f of agentResult.created) log(chalk.green(`  + ${f}`));
      for (const f of agentResult.updated) log(chalk.blue(`  ~ ${f}`));
    } else {
      agentSpinner?.warn('No agents fetched (network issues?)');
    }
  } catch (e) {
    agentSpinner?.warn(`Agent fetch failed: ${(e as Error).message}`);
  }
}
