import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import type { Command } from 'commander';
import { loadConfig } from '../../config';
import { scanProject } from '../../scanner';
import { buildGraph } from '../../graph-builder';
import { resolveProjectRoot } from '../../project-root';
import { logResolvedProjectRoot } from '../io';

export function registerReviewCommand(program: Command): void {
  program
    .command('review [dir]')
    .description('Review graph accuracy — report only, no file changes')
    .action(async (dir: string | undefined) => {
      const projectRoot = resolveProjectRoot(dir);
      logResolvedProjectRoot((...a: unknown[]) => console.log(...a), projectRoot, {});
      const config = loadConfig(projectRoot);

      const spinner = ora('Scanning project...').start();
      let scan;
      try {
        scan = await scanProject(projectRoot, config.maxFiles, config.maxInputTokens, { unlimited: true });
        spinner.succeed(`Scanned ${scan.fileCount} files`);
      } catch (e) {
        spinner.fail('Scan failed');
        console.error(chalk.red((e as Error).message));
        process.exit(1);
      }

      const spinner2 = ora(`Reviewing with ${config.provider.model}...`).start();
      let result;
      try {
        result = await buildGraph(scan, config, 'REVIEW', {
          existingGraphDir: path.join(projectRoot, '.github', 'instructions'),
        });
        spinner2.stop();
      } catch (e) {
        spinner2.fail('LLM call failed');
        console.error(chalk.red((e as Error).message));
        process.exit(1);
      }

      if (result.files.length === 0) {
        console.log('\n' + result.rawResponse);
        console.log(chalk.dim('\n(Review complete — no file changes made)'));
      } else {
        console.log(chalk.yellow('Note: review mode returned file blocks. Run actualize to apply.'));
      }
    });
}
