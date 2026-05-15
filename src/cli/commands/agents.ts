import chalk from 'chalk';
import ora from 'ora';
import type { Command } from 'commander';
import { scanProject } from '../../scanner';
import { resolveProjectRoot } from '../../project-root';
import { matchAgents, fetchAgents, writeAgents } from '../../agents';
import { createLoggers, logResolvedProjectRoot } from '../io';

export function registerAgentsCommand(program: Command): void {
  program
    .command('agents [dir]')
    .description('Fetch/update recommended AI agents for this project (from agency-agents)')
    .option('--max <n>', 'Maximum number of agents to install', '10')
    .option('--dry-run', 'Preview matched agents without downloading')
    .option('--json', 'Output result as JSON to stdout')
    .action(async (dir: string | undefined, opts: { max?: string; dryRun?: boolean; json?: boolean }) => {
      const { jsonOutput, log } = createLoggers(opts);
      const projectRoot = resolveProjectRoot(dir);
      logResolvedProjectRoot((...a: unknown[]) => {
        if (!jsonOutput) console.log(...a);
      }, projectRoot, { json: jsonOutput });
      const parsedMax = parseInt(opts.max ?? '10', 10);
      const maxAgents = Number.isNaN(parsedMax) || parsedMax <= 0 ? 10 : parsedMax;

      const spinner = jsonOutput ? null : ora('Scanning project for agent matching...').start();
      let scan;
      try {
        scan = await scanProject(projectRoot, 200, 80000, { unlimited: true });
        spinner?.succeed(`Scanned ${scan.fileCount} files`);
      } catch (e) {
        spinner?.fail('Scan failed');
        console.error(chalk.red((e as Error).message));
        process.exit(1);
      }

      const matched = matchAgents(scan, undefined, maxAgents);

      if (matched.length === 0) {
        if (jsonOutput) {
          console.log(JSON.stringify({ status: 'no-matches', agents: [] }));
          return;
        }
        log(chalk.yellow('No matching agents found for this project.'));
        return;
      }

      log(chalk.dim(`\nMatched ${matched.length} agents for this project:`));
      for (const a of matched) {
        log(`  ${chalk.cyan(a.name)} — ${chalk.dim(a.description)}`);
      }
      log('');

      if (opts.dryRun) {
        log(chalk.yellow('[dry-run] No agents downloaded.'));
        return;
      }

      const fetchSpinner = jsonOutput ? null : ora(`Fetching ${matched.length} agents from GitHub...`).start();
      try {
        const fetched = await fetchAgents(matched, (done, total, name) => {
          if (fetchSpinner) fetchSpinner.text = `Fetching agents (${done}/${total}): ${name}`;
        });
        if (fetched.length > 0) {
          const result = writeAgents(fetched, projectRoot);
          fetchSpinner?.succeed(`${fetched.length} agents installed in .github/agents/`);
          for (const f of result.created) log(chalk.green(`  + ${f}`));
          for (const f of result.updated) log(chalk.blue(`  ~ ${f}`));
          log(chalk.dim(`\n  README: ${result.readmePath}`));
        } else {
          fetchSpinner?.warn('No agents fetched (network issues?)');
        }
        if (jsonOutput) {
          console.log(
            JSON.stringify({
              status: 'ok',
              agents: fetched.map(a => ({ slug: a.slug, name: a.name, category: a.category })),
            })
          );
        }
      } catch (e) {
        fetchSpinner?.fail(`Agent fetch failed: ${(e as Error).message}`);
        process.exit(1);
      }
    });
}
