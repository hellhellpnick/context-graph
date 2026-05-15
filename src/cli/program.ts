import { Command } from 'commander';
import { PKG_VERSION } from './version';
import { registerBuildCommand } from './commands/build';
import { registerActualizeCommand } from './commands/actualize';
import { registerReviewCommand } from './commands/review';
import { registerImpactCommand } from './commands/impact';
import { registerValidateCommand } from './commands/validate';
import { registerHookCheckCommand } from './commands/hook-check';
import { registerAgentsCommand } from './commands/agents';

export const program = new Command();

program
  .name('context-graph')
  .description('Auto-generate AI context graphs for any codebase')
  .version(PKG_VERSION);

registerBuildCommand(program);
registerActualizeCommand(program);
registerReviewCommand(program);
registerImpactCommand(program);
registerValidateCommand(program);
registerHookCheckCommand(program);
registerAgentsCommand(program);
