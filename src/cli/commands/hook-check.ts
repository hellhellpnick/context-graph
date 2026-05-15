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
import { logResolvedProjectRoot, promptHookRunActualize } from '../io';

export function registerHookCheckCommand(program: Command): void {
  program
    .command('hook-check [dir]')
    .description('Internal: called by git pre-push hook')
    .action(async (dir: string | undefined) => {
      const projectRoot = resolveProjectRoot(dir);
      logResolvedProjectRoot((...a: unknown[]) => console.log(...a), projectRoot, {});

      const changedFiles = getChangedFilesSinceLastBuild(projectRoot);
      const significant = filterSignificantFiles(changedFiles);

      if (significant.length === 0) {
        process.exit(0);
      }

      console.log(
        chalk.yellow(
          `\n⚡ Context graph: ${significant.length} significant file(s) changed since last \`context-graph build\`.`
        )
      );
      for (const f of significant.slice(0, 8)) console.log(chalk.dim(`  ${f}`));
      if (significant.length > 8) console.log(chalk.dim(`  ... and ${significant.length - 8} more`));
      console.log(
        chalk.dim(
          `  ${chalk.bold('Reminder (non-blocking):')} run ${chalk.cyan('npm run graph:actualize')} or ${chalk.cyan('context-graph actualize')} when you want Copilot instructions in sync (works with Ollama if \`provider\` is \`ollama\`).`
        )
      );

      let shouldActualize = false;
      try {
        shouldActualize = await promptHookRunActualize();
      } catch {
        console.log(chalk.dim('  (non-interactive: push continues; run graph:actualize when convenient)\n'));
        process.exit(0);
      }

      if (!shouldActualize) {
        process.exit(0);
      }

      console.log('');
      const config = loadConfig(projectRoot);
      const spinner = ora('Scanning project...').start();
      const scan = await scanProject(projectRoot, config.maxFiles, config.maxInputTokens, { unlimited: true });
      spinner.succeed(`Scanned ${scan.fileCount} files`);

      const spinner2 = ora(`Actualizing with ${config.provider.model}...`).start();
      try {
        const graphDir = path.join(projectRoot, '.github', 'instructions');
        const buildResult = await buildGraph(scan, config, 'ACTUALIZE', {
          changedFiles: significant,
          existingGraphDir: graphDir,
        });
        const files = buildResult.files;
        spinner2.succeed(`Actualized (${files.length} files updated)`);

        if (files.length > 0) {
          const writeResult = writeOutputFiles(files, projectRoot);
          for (const f of writeResult.updated) console.log(chalk.blue(`  ~ ${f}`));
          saveLastBuildRef(projectRoot);
        }
      } catch (e) {
        spinner2.fail('Actualize failed — pushing anyway');
        console.error(chalk.dim((e as Error).message));
      }

      process.exit(0);
    });
}
