import chalk from 'chalk';
import ora from 'ora';
import type { Command } from 'commander';
import { loadConfig } from '../../config';
import { scanProject } from '../../scanner';
import { buildGraph } from '../../graph-builder';
import { resolveProjectRoot } from '../../project-root';
import { logResolvedProjectRoot } from '../io';

export function registerImpactCommand(program: Command): void {
  program
    .command('impact <file> [dir]')
    .description('Analyze blast radius of changing a specific file')
    .action(async (file: string, dir: string | undefined) => {
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

      const spinner2 = ora(`Analyzing impact with ${config.provider.model}...`).start();
      try {
        const result = await buildGraph(scan, config, 'IMPACT', { targetFile: file });
        spinner2.stop();
        console.log('\n' + result.rawResponse);
        console.log(chalk.dim('\n(Impact analysis complete — no file changes made)'));
      } catch (e) {
        spinner2.fail('LLM call failed');
        console.error(chalk.red((e as Error).message));
        process.exit(1);
      }
    });
}
