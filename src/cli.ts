#!/usr/bin/env node
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { loadConfig, initConfig, initConfigInteractive, providerAllowsMissingApiKey, type Config, type SubsystemLayout } from './config';
import { scanProject } from './scanner';
import {
  buildGraph,
  buildGraphMultiPass,
  buildGraphDeterministic,
  buildGraphHybrid,
  type BuildPlan,
  repairOptionsFromConfig,
} from './graph-builder';
import { resolveProjectRoot } from './project-root';
import { writeOutputFiles } from './writer';
import {
  installPrePushHook,
  saveLastBuildRef,
  getChangedFilesSinceLastBuild,
  filterSignificantFiles,
} from './hooks';
import { matchAgents, fetchAgents, writeAgents } from './agents';

const program = new Command();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PKG_VERSION: string = (require('../package.json') as { version: string }).version;

program
  .name('context-graph')
  .description('Auto-generate AI context graphs for any codebase')
  .version(PKG_VERSION);

// ── Shared output helpers ─────────────────────────────────────────────────

function logResolvedProjectRoot(
  log: (...args: unknown[]) => void,
  projectRoot: string,
  opts: { quiet?: boolean; json?: boolean }
) {
  if (opts.quiet || opts.json) return;
  const cw = path.resolve(process.cwd());
  const pr = path.resolve(projectRoot);
  if (pr !== cw) {
    log(chalk.dim(`Project root: ${pr} (terminal cwd: ${cw})`));
  }
}

function formatCost(costUSD: number | null, inputTokens: number, outputTokens: number): string {
  const tokenStr = `${Math.round(inputTokens / 1000)}k in / ${Math.round(outputTokens / 1000)}k out`;
  if (costUSD === null) return chalk.dim(` · ${tokenStr}`);
  return chalk.dim(` · ~$${costUSD.toFixed(3)} · ${tokenStr}`);
}

// ── BUILD ──────────────────────────────────────────────────────────────────

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
    const quiet = opts.quiet ?? false;
    const jsonOutput = opts.json ?? false;
    const log = (...args: unknown[]) => { if (!quiet && !jsonOutput) console.log(...args); };
    const projectRoot = resolveProjectRoot(dir);
    logResolvedProjectRoot(log, projectRoot, { quiet, json: jsonOutput });

    const useLlm = opts.llm !== false;
    const useHybridOverride = !!opts.hybrid;
    const hybridMaxOverride = opts.hybridMax ? parseInt(opts.hybridMax, 10) : undefined;

    // Create config if missing
    const configPath = require('path').join(projectRoot, '.context-graph.json');
    const configExists = require('fs').existsSync(configPath);

    if (!configExists && useLlm) {
      if (opts.provider) {
        // Non-interactive: use CLI flags
        initConfig(projectRoot, opts.provider, opts.model);
        log(chalk.dim(`Created .context-graph.json with ${opts.provider}`));
      } else {
        // Interactive: ask user
        const created = await initConfigInteractive(projectRoot);
        if (created) {
          log(chalk.dim('Created .context-graph.json\n'));
        }
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

    // Show config source
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

    const strategyFromConfig = config.buildStrategy;
    const requestedStrategy =
      opts.llm === false
        ? 'deterministic'
        : useHybridOverride
          ? 'hybrid'
          : strategyFromConfig;
    const effectiveHybridMax =
      typeof hybridMaxOverride === 'number' && Number.isFinite(hybridMaxOverride) && hybridMaxOverride >= 0
        ? hybridMaxOverride
        : config.hybridMaxSubsystems;

    const needsLlm = requestedStrategy === 'llm' || requestedStrategy === 'hybrid';

    if (requestedStrategy === 'deterministic') {
      log(chalk.dim(`Using deterministic build (from ${configSource})`));
    } else if (requestedStrategy === 'hybrid') {
      log(chalk.dim(`Using hybrid build (from ${configSource})`));
    } else if (needsLlm) {
      log(chalk.dim(`Using ${config.provider.provider}/${config.provider.model} (from ${configSource})`));
    }
    if (opts.dryRun) log(chalk.yellow('[dry-run] No files will be written.'));

    if (needsLlm) {
      // Validate API key early (Ollama uses a placeholder if unset)
      const apiKeyEnvName = config.provider.apiKeyEnv;
      const apiKey = apiKeyEnvName ? process.env[apiKeyEnvName] : undefined;
      if (!apiKey && !providerAllowsMissingApiKey(config.provider.provider)) {
        const safeEnvName = apiKeyEnvName && apiKeyEnvName.length < 40 && /^[A-Z_][A-Z0-9_]*$/.test(apiKeyEnvName)
          ? apiKeyEnvName
          : 'OPENAI_API_KEY (or the appropriate env var for your provider)';
        console.error(chalk.red(`✗ Missing API key. Set ${safeEnvName} in your .env or environment.`));
        process.exit(1);
      }
    }

    // Scan — BUILD always scans the full project with no limits
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

    // Build graph with LLM — Pass 0 planning → Pass 1 root → Pass 2...N subsystems
    let allFiles: ReturnType<typeof Array.prototype.concat> = [];
    let totalUsage = { inputTokens: 0, outputTokens: 0 };
    let totalCostUSD: number | null = null;
    let totalPasses = 0;

    let spinner2 = quiet || jsonOutput
      ? null
      : ora(
          requestedStrategy === 'hybrid'
            ? `Hybrid build — deterministic scaffold + LLM enrich...`
            : (requestedStrategy === 'llm' ? 'Planning — analyzing project structure...' : 'Building deterministically (no LLM)...')
        ).start();
    let resolvedPlan: BuildPlan | null = null;

    try {
      const result = needsLlm
        ? (requestedStrategy === 'hybrid'
          ? await buildGraphHybrid(scan, config, {
              onPlanReady: (plan) => { resolvedPlan = plan; },
              onPassComplete: (pass, total, label, passFiles, passCost) => {
                totalPasses = pass;
                if (quiet || jsonOutput) return;
                const costStr = passCost !== null ? ` · ~$${passCost.toFixed(3)}` : '';
                const fileStr = passFiles.length > 0 ? `${passFiles.length} file(s)` : 'no files parsed';
                spinner2?.succeed(`Pass ${pass}/${total} — ${label} · ${fileStr}${costStr}`);
                if (pass < total) spinner2 = ora(`Pass ${pass + 1}/${total} — continuing...`).start();
              },
            }, { maxSubsystems: effectiveHybridMax, notesMode: config.hybridNotesMode })
          : await buildGraphMultiPass(scan, config, {
            onPlanReady: (plan) => {
              resolvedPlan = plan;
              if (!quiet && !jsonOutput) {
                const total = 1 + 1 + plan.subsystems.length; // plan + root + subsystems
                spinner2?.succeed(
                  `Planning complete — ${plan.subsystems.length} subsystems · ${total} total passes`
                );
                spinner2 = ora('Pass 2 — generating root files...').start();
              }
            },
            onPassComplete: (pass, total, label, passFiles, passCost) => {
              totalPasses = pass;
              if (quiet || jsonOutput) return;
              const costStr = passCost !== null ? ` · ~$${passCost.toFixed(3)}` : '';
              const fileStr = passFiles.length > 0 ? `${passFiles.length} file(s)` : 'no files parsed';

              if (label === 'planning') {
                // Spinner already advanced by onPlanReady
              } else if (label === 'root files') {
                spinner2?.succeed(`Pass ${pass}/${total} — root files · ${fileStr}${costStr}`);
                if (pass < total) spinner2 = ora(`Pass ${pass + 1}/${total} — subsystem files...`).start();
              } else {
                spinner2?.succeed(`Pass ${pass}/${total} — ${label} · ${fileStr}${costStr}`);
                if (pass < total) spinner2 = ora(`Pass ${pass + 1}/${total} — ${label}...`).start();
              }
            },
          })
        )
        : buildGraphDeterministic(scan, { repair: repairOptionsFromConfig(config) });

      spinner2?.stop();
      allFiles = result.files;
      totalUsage = result.usage;
      totalCostUSD = result.costUSD;
      resolvedPlan = result.plan;
      totalPasses = result.passes;

      if (!quiet && !jsonOutput) {
        console.log(
          chalk.green(`✔ Graph built in ${totalPasses} passes `) +
          chalk.dim(`(${allFiles.length} files)`) +
          formatCost(totalCostUSD, totalUsage.inputTokens, totalUsage.outputTokens)
        );
      }
    } catch (e) {
      spinner2?.fail('LLM call failed');
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    }

    const files = allFiles;
    const usage = totalUsage;
    const costUSD = totalCostUSD;

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

    // Write files
    const writeResult = writeOutputFiles(files, projectRoot);
    for (const f of writeResult.created) log(chalk.green(`  + ${f}`));
    for (const f of writeResult.updated) log(chalk.blue(`  ~ ${f}`));
    for (const e of writeResult.errors) console.error(chalk.red(`  ✗ ${e.path}: ${e.error}`));

    // Save ref for pre-push hook
    saveLastBuildRef(projectRoot);

    // Install pre-push hook
    if (opts.hook !== false) {
      const hookResult = installPrePushHook(projectRoot);
      if (hookResult === 'installed') {
        log(chalk.dim('\n✓ Installed git pre-push hook (will prompt to actualize on push)'));
      } else if (hookResult === 'updated') {
        log(chalk.dim('\n✓ Appended to existing git pre-push hook'));
      }
    }

    // ── Agents: match & fetch recommended agents ───────────────────────────
    const matched = matchAgents(scan, resolvedPlan ?? undefined);
    if (matched.length > 0 && !opts.dryRun) {
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

    if (jsonOutput) {
      console.log(JSON.stringify({
        status: 'ok',
        filesCreated: writeResult.created,
        filesUpdated: writeResult.updated,
        filesTotal: writeResult.created.length + writeResult.updated.length,
        usage,
        costUSD,
      }));
      return;
    }

    log(
      chalk.bold.green(
        `\n✓ Context graph built: ${writeResult.created.length + writeResult.updated.length} files in .github/instructions/`
      )
    );
  });

// ── ACTUALIZE ─────────────────────────────────────────────────────────────

program
  .command('actualize [dir]')
  .description('Update context graph based on files changed since last build')
  .option('--all', 'Re-scan the entire project instead of only changed files')
  .option('--dry-run', 'Preview files that would be updated without writing them')
  .option('--quiet', 'Suppress all output except errors')
  .option('--json', 'Output result as JSON to stdout')
  .action(async (dir: string | undefined, opts: { all: boolean; dryRun?: boolean; quiet?: boolean; json?: boolean }) => {
    const quiet = opts.quiet ?? false;
    const jsonOutput = opts.json ?? false;
    const log = (...args: unknown[]) => { if (!quiet && !jsonOutput) console.log(...args); };
    const projectRoot = resolveProjectRoot(dir);
    logResolvedProjectRoot(log, projectRoot, { quiet, json: jsonOutput });

    const graphDir = path.join(projectRoot, '.github', 'instructions');
    if (!require('fs').existsSync(graphDir)) {
      console.error(chalk.red('✗ No context graph found. Run `context-graph build` first.'));
      process.exit(1);
    }

    const config = loadConfig(projectRoot);

    let changedFiles: string[] = [];
    if (!opts.all) {
      changedFiles = getChangedFilesSinceLastBuild(projectRoot);
      const significant = filterSignificantFiles(changedFiles);
      if (significant.length === 0) {
        if (jsonOutput) { console.log(JSON.stringify({ status: 'up-to-date' })); return; }
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
      spinner2?.succeed(`Actualized (${files.length} files updated)${formatCost(costUSD, usage.inputTokens, usage.outputTokens)}`);
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
        console.log(JSON.stringify({
          status: 'ok',
          filesCreated: writeResult.created,
          filesUpdated: writeResult.updated,
          usage,
          costUSD,
        }));
      }
    } else {
      if (jsonOutput) { console.log(JSON.stringify({ status: 'no-changes' })); return; }
      log(chalk.yellow('⚠ No file updates returned by LLM.'));
    }
  });

// ── REVIEW ────────────────────────────────────────────────────────────────

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

    // REVIEW mode — print raw response
    if (result.files.length === 0) {
      console.log('\n' + result.rawResponse);
      console.log(chalk.dim('\n(Review complete — no file changes made)'));
    } else {
      console.log(chalk.yellow('Note: review mode returned file blocks. Run actualize to apply.'));
    }
  });

// ── IMPACT ────────────────────────────────────────────────────────────────

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

// ── VALIDATE ──────────────────────────────────────────────────────────────

program
  .command('validate [dir]')
  .description('Exit 1 if context graph is outdated — for use in CI pipelines')
  .option('--json', 'Output result as JSON to stdout')
  .action((dir: string | undefined, opts: { json?: boolean }) => {
    const projectRoot = resolveProjectRoot(dir);
    logResolvedProjectRoot((...a: unknown[]) => console.log(...a), projectRoot, { json: opts.json });

    const graphDir = path.join(projectRoot, '.github', 'instructions');
    if (!require('fs').existsSync(graphDir)) {
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
        console.error(chalk.red(`✗ Context graph outdated: ${significant.length} file(s) changed since last build:`));
        for (const f of significant.slice(0, 10)) console.error(chalk.dim(`  ${f}`));
        if (significant.length > 10) console.error(chalk.dim(`  ... and ${significant.length - 10} more`));
        console.error(chalk.dim('  Run: npm run graph:actualize  (or: npx context-graph actualize)'));
      }
      process.exit(1);
    }

    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok' }));
    } else {
      console.log(chalk.green('✓ Context graph is up to date.'));
    }
  });

// ── HOOK-CHECK (internal, called by git pre-push hook) ────────────────────

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
      chalk.yellow(`\n⚡ Context graph: ${significant.length} significant file(s) changed since last \`context-graph build\`.`)
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
      // Dynamically require enquirer to avoid crashing in non-interactive terminals
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { prompt } = require('enquirer') as { prompt: (q: unknown) => Promise<{ actualize: boolean }> };
      const answer = await prompt({
        type: 'confirm',
        name: 'actualize',
        message: 'Run actualize now (optional — uses your configured LLM)?',
        initial: false,
      });
      shouldActualize = answer.actualize;
    } catch {
      // Non-interactive / no TTY — soft reminder already printed; never block push
      console.log(chalk.dim('  (non-interactive: push continues; run graph:actualize when convenient)\n'));
      process.exit(0);
    }

    if (!shouldActualize) {
      process.exit(0);
    }

    // Run actualize inline
    console.log('');
    const config = loadConfig(projectRoot);
    const spinner = ora('Scanning project...').start();
    const scan = await scanProject(projectRoot, config.maxFiles, config.maxInputTokens, { unlimited: true });
    spinner.succeed(`Scanned ${scan.fileCount} files`);

    const spinner2 = ora(`Actualizing with ${config.provider.model}...`).start();
    try {
      const graphDir = path.join(projectRoot, '.github', 'instructions');
      const result = await buildGraph(scan, config, 'ACTUALIZE', {
        changedFiles: significant,
        existingGraphDir: graphDir,
      });
      const files = result.files;
      spinner2.succeed(`Actualized (${files.length} files updated)`);

      if (files.length > 0) {
        const result = writeOutputFiles(files, projectRoot);
        for (const f of result.updated) console.log(chalk.blue(`  ~ ${f}`));
        saveLastBuildRef(projectRoot);
      }
    } catch (e) {
      spinner2.fail('Actualize failed — pushing anyway');
      console.error(chalk.dim((e as Error).message));
    }

    process.exit(0);
  });

// ── AGENTS ────────────────────────────────────────────────────────────────

program
  .command('agents [dir]')
  .description('Fetch/update recommended AI agents for this project (from agency-agents)')
  .option('--max <n>', 'Maximum number of agents to install', '10')
  .option('--dry-run', 'Preview matched agents without downloading')
  .option('--json', 'Output result as JSON to stdout')
  .action(async (dir: string | undefined, opts: { max?: string; dryRun?: boolean; json?: boolean }) => {
    const jsonOutput = opts.json ?? false;
    const log = (...args: unknown[]) => { if (!jsonOutput) console.log(...args); };
    const projectRoot = resolveProjectRoot(dir);
    logResolvedProjectRoot((...a: unknown[]) => { if (!jsonOutput) console.log(...a); }, projectRoot, { json: jsonOutput });
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
      if (jsonOutput) { console.log(JSON.stringify({ status: 'no-matches', agents: [] })); return; }
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
        console.log(JSON.stringify({
          status: 'ok',
          agents: fetched.map(a => ({ slug: a.slug, name: a.name, category: a.category })),
        }));
      }
    } catch (e) {
      fetchSpinner?.fail(`Agent fetch failed: ${(e as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
