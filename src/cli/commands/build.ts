import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import type { Command } from 'commander';
import {
  loadConfig,
  initConfig,
  initConfigInteractive,
  readConfigFile,
  providerAllowsMissingApiKey,
  ensureDeterministicSetup,
  projectGraphExists,
  type Config,
  type SubsystemLayout,
} from '../../config';
import { scanProject } from '../../scanner';
import {
  assertProjectRootExists,
  normalizeBuildDirArg,
  resolveProjectRoot,
  suggestedBuildFlagForMistake,
} from '../../project-root';
import { writeOutputFiles } from '../../writer';
import { installPrePushHook, saveLastBuildRef } from '../../hooks';
import { createLoggers, formatCost, logResolvedProjectRoot } from '../io';
import { installRecommendedAgents } from '../agents-install';
import { runGraphBuild, resolveBuildStrategy } from '../build-run';

export function registerBuildCommand(program: Command): void {
  program
    .command('build [dir]')
    .description('Build context graph from scratch and install git pre-push hook')
    .option('--no-hook', 'Skip installing the pre-push git hook')
    .option('--provider <name>', 'Override LLM provider (openai|anthropic|openai-compat|ollama)')
    .option('--model <name>', 'Override model name')
    .option('--no-llm', 'Override: deterministic build (no network, no tokens, no LLM required)')
    .option('--hybrid', 'Override: hybrid build (deterministic scaffold + LLM notes)')
    .option('--hybrid-max <n>', 'Override: hybrid subsystems notes count (default from config)', undefined)
    .option('--dry-run', 'Preview files that would be written without writing them')
    .option('--quiet', 'Suppress all output except errors')
    .option('--json', 'Output result as JSON to stdout')
    .option(
      '--subsystem-grouping <mode>',
      'Subsystem layout for gap-fill / no-LLM: default | by-folder (one instruction file per directory)'
    )
    .option(
      '--max-files-per-folder <n>',
      'With by-folder: max source files per instruction before splitting (default from config, 4–200)'
    )
    .option('--subsystem-layout <mode>', 'mirror (default) | canonical — where *.instructions.md live under .github/instructions/')
    .action(async (dir: string | undefined, opts: {
      hook: boolean;
      provider?: string;
      model?: string;
      llm?: boolean;
      hybrid?: boolean;
      hybridMax?: string;
      dryRun?: boolean;
      quiet?: boolean;
      json?: boolean;
      subsystemGrouping?: string;
      maxFilesPerFolder?: string;
      subsystemLayout?: string;
    }) => {
      const { quiet, jsonOutput, log } = createLoggers(opts);
      const dirNorm = normalizeBuildDirArg(dir);
      const projectRoot = resolveProjectRoot(dirNorm.projectDir);
      try {
        assertProjectRootExists(projectRoot);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (jsonOutput) {
          console.log(JSON.stringify({ status: 'error', error: msg }));
        } else {
          console.error(chalk.red(`✗ ${msg}`));
          if (dir && dir !== dirNorm.projectDir) {
            console.error(
              chalk.dim(
                `Did you mean \`context-graph build ${suggestedBuildFlagForMistake(dirNorm.mistakenModeFlag!)}\`?`
              )
            );
          }
        }
        process.exit(1);
      }
      if (dirNorm.mistakenModeFlag && !quiet && !jsonOutput) {
        log(
          chalk.yellow(
            `Note: "${dir}" is a build mode — use \`context-graph build ${suggestedBuildFlagForMistake(dirNorm.mistakenModeFlag)}\` (using repo root).`
          )
        );
      }
      logResolvedProjectRoot(log, projectRoot, { quiet, json: jsonOutput });

      const useLlm = opts.llm !== false;
      const hybridMaxOverride = opts.hybridMax ? parseInt(opts.hybridMax, 10) : undefined;

      const configPath = path.join(projectRoot, '.context-graph.json');
      const configExists = fs.existsSync(configPath);

      if (!configExists && useLlm) {
        if (opts.provider) {
          initConfig(projectRoot, opts.provider, opts.model);
          log(chalk.dim(`Created .context-graph.json with ${opts.provider}`));
        } else {
          const created = await initConfigInteractive(projectRoot);
          if (created) log(chalk.dim('Created .context-graph.json\n'));
        }
      }

      let config: Config = loadConfig(projectRoot);
      if (useLlm) {
        if (opts.provider) config.provider.provider = opts.provider as never;
        if (opts.model) config.provider.model = opts.model;
      }

      if (opts.subsystemGrouping === 'by-folder' || opts.subsystemGrouping === 'default') {
        config.subsystemGrouping = opts.subsystemGrouping;
      }
      const maxFolderRaw = opts.maxFilesPerFolder ? parseInt(opts.maxFilesPerFolder, 10) : NaN;
      if (Number.isFinite(maxFolderRaw) && maxFolderRaw >= 4) {
        config.maxFilesPerFolderSubsystem = Math.min(200, maxFolderRaw);
      }
      if (opts.subsystemLayout === 'mirror' || opts.subsystemLayout === 'canonical') {
        config.subsystemLayout = opts.subsystemLayout as SubsystemLayout;
      }

      const hasEnvProvider = !!process.env.CONTEXT_GRAPH_PROVIDER;
      const hasEnvModel = !!process.env.CONTEXT_GRAPH_MODEL;
      const configSource = !useLlm
        ? 'deterministic'
        : opts.provider
          ? 'CLI flags'
          : hasEnvProvider || hasEnvModel
            ? '.env'
            : configExists
              ? '.context-graph.json'
              : 'defaults';

      const useHybrid =
        !!opts.hybrid || dirNorm.mistakenModeFlag === 'hybrid';
      const forceNoLlm =
        opts.llm === false || dirNorm.mistakenModeFlag === 'deterministic';

      const { strategy, effectiveHybridMax, needsLlm } = resolveBuildStrategy(config, {
        noLlm: forceNoLlm,
        hybrid: useHybrid,
        hybridMaxOverride,
      });

      if (strategy === 'deterministic') {
        const fileConfig = readConfigFile(projectRoot);
        const graphExists = projectGraphExists(projectRoot);
        const interactive = !quiet && !jsonOutput;

        if (!graphExists && interactive) {
          log(chalk.dim('No instruction graph yet — first build will create .github/instructions/'));
        }

        const setup = await ensureDeterministicSetup({
          projectRoot,
          fileConfig,
          interactive,
          graphExists,
        });
        config = {
          ...config,
          instructionTargets: setup.instructionTargets,
          installAgents: setup.installAgents,
          buildStrategy: 'deterministic',
        };
        if (interactive && setup.prompted) {
          const agentsNote = setup.installAgents ? 'install agents' : 'skip agents';
          log(
            chalk.dim(
              `Saved in .context-graph.json · targets: ${setup.instructionTargets.join(', ')} · ${agentsNote}`
            )
          );
        } else if (interactive) {
          log(
            chalk.dim(
              `AI targets: ${config.instructionTargets.join(', ')} · agents: ${config.installAgents ? 'yes' : 'no'}`
            )
          );
        }
        log(chalk.dim(`Using deterministic build (from ${configSource})`));
      } else if (strategy === 'hybrid') {
        log(chalk.dim(`Using hybrid build (from ${configSource})`));
      } else if (needsLlm) {
        log(chalk.dim(`Using ${config.provider.provider}/${config.provider.model} (from ${configSource})`));
      }
      if (opts.dryRun) log(chalk.yellow('[dry-run] No files will be written.'));

      if (needsLlm) {
        const apiKeyEnvName = config.provider.apiKeyEnv;
        const apiKey = apiKeyEnvName ? process.env[apiKeyEnvName] : undefined;
        if (!apiKey && !providerAllowsMissingApiKey(config.provider.provider)) {
          const safeEnvName =
            apiKeyEnvName && apiKeyEnvName.length < 40 && /^[A-Z_][A-Z0-9_]*$/.test(apiKeyEnvName)
              ? apiKeyEnvName
              : 'OPENAI_API_KEY (or the appropriate env var for your provider)';
          console.error(chalk.red(`✗ Missing API key. Set ${safeEnvName} in your .env or environment.`));
          process.exit(1);
        }
      }

      const spinner = quiet || jsonOutput ? null : ora('Scanning project files...').start();
      let scan;
      try {
        scan = await scanProject(projectRoot, 200, 80000, { unlimited: true });
        spinner?.succeed(`Scanned ${scan.fileCount} files (~${Math.round(scan.tokenEstimate / 1000)}k tokens)`);
      } catch (e) {
        spinner?.fail('Scan failed');
        console.error(chalk.red((e as Error).message));
        process.exit(1);
      }

      let spinner2 = quiet || jsonOutput
        ? null
        : ora(
            strategy === 'hybrid'
              ? 'Hybrid build — deterministic scaffold + LLM enrich...'
              : strategy === 'llm'
                ? 'Planning — analyzing project structure...'
                : 'Building deterministically (no LLM)...'
          ).start();

      let result;
      try {
        result = await runGraphBuild(scan, config, {
          strategy,
          effectiveHybridMax,
          quiet,
          jsonOutput,
          getSpinner: () => spinner2,
          setSpinner: s => {
            spinner2 = s;
          },
        });
      } catch (e) {
        spinner2?.fail('LLM call failed');
        console.error(chalk.red((e as Error).message));
        process.exit(1);
      }

      const { files, usage, costUSD } = result;

      if (files.length === 0) {
        console.warn(chalk.yellow('⚠ No output files parsed from LLM response.'));
        console.warn(chalk.dim('   The model may have ignored the output format instruction.'));
        console.warn(chalk.dim('   Try switching to --provider anthropic (better output token limits).'));
        process.exit(1);
      }

      if (opts.dryRun) {
        log('');
        for (const f of files) log(chalk.dim(`  [dry-run] would write: ${f.path}`));
        log(chalk.yellow('\n[dry-run] No files written.'));
        return;
      }

      const writeResult = writeOutputFiles(files, projectRoot);
      for (const f of writeResult.created) log(chalk.green(`  + ${f}`));
      for (const f of writeResult.updated) log(chalk.blue(`  ~ ${f}`));
      for (const e of writeResult.errors) console.error(chalk.red(`  ✗ ${e.path}: ${e.error}`));

      saveLastBuildRef(projectRoot);

      if (opts.hook !== false) {
        const hookResult = installPrePushHook(projectRoot);
        if (hookResult === 'installed') {
          log(chalk.dim('\n✓ Installed git pre-push hook (will prompt to actualize on push)'));
        } else if (hookResult === 'updated') {
          log(chalk.dim('\n✓ Appended to existing git pre-push hook'));
        }
      }

      if (config.installAgents) {
        await installRecommendedAgents(scan, result.plan, projectRoot, {
          quiet,
          jsonOutput,
          dryRun: opts.dryRun,
          log,
        });
      }

      if (jsonOutput) {
        console.log(
          JSON.stringify({
            status: 'ok',
            filesCreated: writeResult.created,
            filesUpdated: writeResult.updated,
            filesTotal: writeResult.created.length + writeResult.updated.length,
            usage,
            costUSD,
          })
        );
        return;
      }

      log(
        chalk.bold.green(
          `\n✓ Context graph built: ${writeResult.created.length + writeResult.updated.length} files in .github/instructions/`
        )
      );
    });
}
