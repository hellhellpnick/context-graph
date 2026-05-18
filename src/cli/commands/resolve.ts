import chalk from 'chalk';
import type { Command } from 'commander';
import { formatResolveResult, resolveSymbolQuery } from '../../graph-builder/resolve-symbol';
import { projectGraphExists } from '../../project-graph';
import { resolveProjectRoot } from '../../project-root';
import { createLoggers, logResolvedProjectRoot } from '../io';

export function registerResolveCommand(program: Command): void {
  program
    .command('resolve <query> [dir]')
    .description(
      'Resolve a file/component name to context-graph instruction path (read symbol-index, no repo grep)'
    )
    .option('--json', 'Output matches as JSON')
    .action((query: string, dir: string | undefined, opts: { json?: boolean }) => {
      const { jsonOutput, log } = createLoggers(opts);
      const projectRoot = resolveProjectRoot(dir);
      logResolvedProjectRoot(log, projectRoot, { json: jsonOutput });

      if (!projectGraphExists(projectRoot)) {
        const msg = 'No context graph. Run `context-graph build --no-llm` first.';
        if (jsonOutput) {
          console.log(JSON.stringify({ status: 'error', error: msg }));
        } else {
          console.error(chalk.red(`✗ ${msg}`));
        }
        process.exit(1);
      }

      const matches = resolveSymbolQuery(projectRoot, query);
      if (jsonOutput) {
        console.log(
          JSON.stringify({
            status: matches.length > 0 ? 'ok' : 'not_found',
            query,
            matches,
          })
        );
        process.exit(matches.length > 0 ? 0 : 1);
      }

      console.log(formatResolveResult(projectRoot, query, matches));
      process.exit(matches.length > 0 ? 0 : 1);
    });
}
