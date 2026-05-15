import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import type { Command } from 'commander';
import { loadConfig } from '../../config';
import { scanProject } from '../../scanner';
import { buildGraph } from '../../graph-builder';
import { resolveProjectRoot } from '../../project-root';
import { writeOutputFiles } from '../../writer';
import { saveLastBuildRef, getChangedFilesSinceLastBuild, filterSignificantFiles } from '../../hooks';
import { createLoggers, formatCost, logResolvedProjectRoot } from '../io';

export function registerActualizeCommand(program: Command): void {
  program
    .command('actualize [dir]')
    .description('Update context graph based on files changed since last build')
    .option('--all', 'Re-scan the entire project instead of only changed files')
    .option('--dry-run', 'Preview files that would be updated without writing them')
    .option('--quiet', 'Suppress all output except errors')
    .option('--json', 'Output result as JSON to stdout')
    .action(async (dir: string | undefined, opts: { all: boolean; dryRun?: boolean; quiet?: boolean; json?: boolean }) => {
      const { quiet, jsonOutput, log } = createLoggers(opts);
      const projectRoot = resolveProjectRoot(dir);
      logResolvedProjectRoot(log, projectRoot, { quiet, json: jsonOutput });

      const graphDir = path.join(projectRoot, '.github', 'instructions');
      if (!fs.existsSync(graphDir)) {
        console.error(chalk.red('✗ No context graph found. Run `context-graph build` first.'));
        process.exit(1);
      }

      const config = loadConfig(projectRoot);

      let changedFiles: string[] = [];
      if (!opts.all) {
        changedFiles = getChangedFilesSinceLastBuild(projectRoot);
        const significant = filterSignificantFiles(changedFiles);
        if (significant.length === 0) {
          if (jsonOutput) {
            console.log(JSON.stringify({ status: 'up-to-date' }));
            return;
          }
          log(chalk.green('✓ No significant changes detected. Graph is up to date.'));
          return;
        }
        log(chalk.dim(`${significant.length} changed files:`));
        for (const f of significant.slice(0, 10)) log(chalk.dim(`  ${f}`));
        if (significant.length > 10) log(chalk.dim(`  ... and ${significant.length - 10} more`));
      }

      const spinner = quiet || jsonOutput ? null : ora('Scanning project...').start();
      let scan;
      try {
        scan = await scanProject(projectRoot, config.maxFiles, config.maxInputTokens, { unlimited: true });
        spinner?.succeed(`Scanned ${scan.fileCount} files`);
      } catch (e) {
        spinner?.fail('Scan failed');
        console.error(chalk.red((e as Error).message));
        process.exit(1);
      }

      const spinner2 = quiet || jsonOutput ? null : ora(`Actualizing with ${config.provider.model}...`).start();
      let files, usage, costUSD;
      try {
        const result = await buildGraph(scan, config, 'ACTUALIZE', {
          changedFiles,
          existingGraphDir: graphDir,
        });
        files = result.files;
        usage = result.usage;
        costUSD = result.costUSD;
        spinner2?.succeed(
          `Actualized (${files.length} files updated)${formatCost(costUSD, usage.inputTokens, usage.outputTokens)}`
        );
      } catch (e) {
        spinner2?.fail('LLM call failed');
        console.error(chalk.red((e as Error).message));
        process.exit(1);
      }

      if (opts.dryRun) {
        log('');
        for (const f of files) log(chalk.dim(`  [dry-run] would write: ${f.path}`));
        log(chalk.yellow('\n[dry-run] No files written.'));
        return;
      }

      if (files.length > 0) {
        const writeResult = writeOutputFiles(files, projectRoot);
        for (const f of writeResult.created) log(chalk.green(`  + ${f}`));
        for (const f of writeResult.updated) log(chalk.blue(`  ~ ${f}`));
        for (const e of writeResult.errors) console.error(chalk.red(`  ✗ ${e.path}: ${e.error}`));
        saveLastBuildRef(projectRoot);

        if (jsonOutput) {
          console.log(
            JSON.stringify({
              status: 'ok',
              filesCreated: writeResult.created,
              filesUpdated: writeResult.updated,
              usage,
              costUSD,
            })
          );
        }
      } else {
        if (jsonOutput) {
          console.log(JSON.stringify({ status: 'no-changes' }));
          return;
        }
        log(chalk.yellow('⚠ No file updates returned by LLM.'));
      }
    });
}
