import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import type { Command } from 'commander';
import { loadConfig } from '../../config';
import { auditRoutingEntrypoints } from '../../graph-builder/deterministic/routing-entrypoints';
import { resolveProjectRoot } from '../../project-root';
import { getChangedFilesSinceLastBuild, filterSignificantFiles } from '../../hooks';
import { logResolvedProjectRoot } from '../io';

export function registerValidateCommand(program: Command): void {
  program
    .command('validate [dir]')
    .description('Exit 1 if context graph is outdated — for use in CI pipelines')
    .option('--json', 'Output result as JSON to stdout')
    .action((dir: string | undefined, opts: { json?: boolean }) => {
      const projectRoot = resolveProjectRoot(dir);
      logResolvedProjectRoot((...a: unknown[]) => console.log(...a), projectRoot, { json: opts.json });

      const graphDir = path.join(projectRoot, '.github', 'instructions');
      if (!fs.existsSync(graphDir)) {
        if (opts.json) {
          console.log(JSON.stringify({ status: 'missing', error: 'No context graph found. Run build first.' }));
        } else {
          console.error(chalk.red('✗ No context graph found. Run `context-graph build` first.'));
        }
        process.exit(1);
      }

      const changedFiles = getChangedFilesSinceLastBuild(projectRoot);
      const significant = filterSignificantFiles(changedFiles);

      if (significant.length > 0) {
        if (opts.json) {
          console.log(JSON.stringify({ status: 'outdated', changedFiles: significant, count: significant.length }));
        } else {
          console.error(
            chalk.red(`✗ Context graph outdated: ${significant.length} file(s) changed since last build:`)
          );
          for (const f of significant.slice(0, 10)) console.error(chalk.dim(`  ${f}`));
          if (significant.length > 10) console.error(chalk.dim(`  ... and ${significant.length - 10} more`));
          console.error(chalk.dim('  Run: npm run graph:actualize  (or: npx context-graph actualize)'));
        }
        process.exit(1);
      }

      const config = loadConfig(projectRoot);
      const routingIssues = auditRoutingEntrypoints(projectRoot, config.instructionTargets);
      if (routingIssues.length > 0) {
        if (opts.json) {
          console.log(JSON.stringify({ status: 'routing', issues: routingIssues }));
        } else {
          console.error(chalk.red(`✗ Agent routing entrypoints incomplete (${routingIssues.length}):`));
          for (const issue of routingIssues.slice(0, 12)) {
            const msg =
              issue.kind === 'missing'
                ? `${issue.relPath} — missing (run context-graph build --no-llm)`
                : `${issue.relPath} — ${issue.detail}`;
            console.error(chalk.dim(`  ${msg}`));
          }
          if (routingIssues.length > 12) {
            console.error(chalk.dim(`  ... and ${routingIssues.length - 12} more`));
          }
        }
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify({ status: 'ok' }));
      } else {
        console.log(chalk.green('✓ Context graph is up to date.'));
      }
    });
}
