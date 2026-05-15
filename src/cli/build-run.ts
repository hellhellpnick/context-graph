import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';
import type { BuildStrategy, Config } from '../config';
import type { ScanResult } from '../scanner';
import {
  buildGraphDeterministic,
  buildGraphHybrid,
  buildGraphMultiPass,
  type BuildPlan,
  type MultiPassResult,
  type RepairBuildPlanOptions,
} from '../graph-builder';
import { formatCost } from './io';

export function resolveBuildStrategy(
  config: Config,
  opts: { noLlm: boolean; hybrid: boolean; hybridMaxOverride?: number }
): {
  strategy: BuildStrategy;
  effectiveHybridMax: number;
  needsLlm: boolean;
} {
  const strategy: BuildStrategy = opts.noLlm
    ? 'deterministic'
    : opts.hybrid
      ? 'hybrid'
      : config.buildStrategy;
  const effectiveHybridMax =
    typeof opts.hybridMaxOverride === 'number' &&
    Number.isFinite(opts.hybridMaxOverride) &&
    opts.hybridMaxOverride >= 0
      ? opts.hybridMaxOverride
      : config.hybridMaxSubsystems;
  const needsLlm = strategy === 'llm' || strategy === 'hybrid';
  return { strategy, effectiveHybridMax, needsLlm };
}

export interface RunGraphBuildOpts {
  strategy: BuildStrategy;
  effectiveHybridMax: number;
  quiet: boolean;
  jsonOutput: boolean;
  repair: RepairBuildPlanOptions;
  getSpinner: () => Ora | null;
  setSpinner: (spinner: Ora | null) => void;
}

export async function runGraphBuild(
  scan: ScanResult,
  config: Config,
  opts: RunGraphBuildOpts
): Promise<MultiPassResult> {
  const { strategy, effectiveHybridMax, quiet, jsonOutput, repair, getSpinner, setSpinner } = opts;
  const needsLlm = strategy === 'llm' || strategy === 'hybrid';

  let resolvedPlan: BuildPlan | null = null;
  let spinner2 = getSpinner();

  const result = needsLlm
    ? strategy === 'hybrid'
      ? await buildGraphHybrid(
          scan,
          config,
          {
            onPlanReady: plan => {
              resolvedPlan = plan;
            },
            onPassComplete: (pass, total, label, passFiles, passCost) => {
              if (quiet || jsonOutput) return;
              const costStr = passCost !== null ? ` · ~$${passCost.toFixed(3)}` : '';
              const fileStr = passFiles.length > 0 ? `${passFiles.length} file(s)` : 'no files parsed';
              spinner2?.succeed(`Pass ${pass}/${total} — ${label} · ${fileStr}${costStr}`);
              if (pass < total) setSpinner(ora(`Pass ${pass + 1}/${total} — continuing...`).start());
              spinner2 = getSpinner();
            },
          },
          { maxSubsystems: effectiveHybridMax, notesMode: config.hybridNotesMode }
        )
      : await buildGraphMultiPass(scan, config, {
          onPlanReady: plan => {
            resolvedPlan = plan;
            if (!quiet && !jsonOutput) {
              const total = 1 + 1 + plan.subsystems.length;
              spinner2?.succeed(
                `Planning complete — ${plan.subsystems.length} subsystems · ${total} total passes`
              );
              setSpinner(ora('Pass 2 — generating root files...').start());
              spinner2 = getSpinner();
            }
          },
          onPassComplete: (pass, total, label, passFiles, passCost) => {
            if (quiet || jsonOutput) return;
            const costStr = passCost !== null ? ` · ~$${passCost.toFixed(3)}` : '';
            const fileStr = passFiles.length > 0 ? `${passFiles.length} file(s)` : 'no files parsed';

            if (label === 'planning') return;
            if (label === 'root files') {
              spinner2?.succeed(`Pass ${pass}/${total} — root files · ${fileStr}${costStr}`);
              if (pass < total) setSpinner(ora(`Pass ${pass + 1}/${total} — subsystem files...`).start());
            } else {
              spinner2?.succeed(`Pass ${pass}/${total} — ${label} · ${fileStr}${costStr}`);
              if (pass < total) setSpinner(ora(`Pass ${pass + 1}/${total} — ${label}...`).start());
            }
            spinner2 = getSpinner();
          },
        })
    : buildGraphDeterministic(scan, { repair });

  getSpinner()?.stop();

  if (!quiet && !jsonOutput) {
    console.log(
      chalk.green(`✔ Graph built in ${result.passes} passes `) +
        chalk.dim(`(${result.files.length} files)`) +
        formatCost(result.costUSD, result.usage.inputTokens, result.usage.outputTokens)
    );
  }

  void resolvedPlan;
  return result;
}
