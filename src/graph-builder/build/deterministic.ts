import type { ScanResult } from '../../scanner';
import type { OutputFile } from '../../writer';
import type { LLMUsage } from '../../providers/types';
import type { InstructionTargetId } from '../../instruction-targets';
import type { DeterministicBuildOptions, MultiPassResult } from '../types';
import { repairBuildPlan } from '../plan/repair';
import { appendCursorRuleFiles } from '../deterministic/cursor-rules';
import { injectDeterministicRootFiles } from '../deterministic/root';
import { buildDeterministicSubsystemFile } from '../deterministic/subsystem';

export function buildGraphDeterministic(
  scan: ScanResult,
  opts: DeterministicBuildOptions = {}
): MultiPassResult {
  const today = new Date().toISOString().slice(0, 10);

  // Deterministic plan: use coverage repair to create a complete mapping.
  const plan = repairBuildPlan(scan, null, opts.repair);

  // Root files are deterministic; optionally allow a "slim root" caller preference
  // (we still emit index.md and metadata.json deterministically because they cost 0 tokens).
  const files: OutputFile[] = [];

  // Subsystem files: deterministic skeleton derived from real exports/imports.
  for (const s of plan.subsystems) {
    const instructionPath = `.github/instructions/${s.file}`;
    files.push(
      buildDeterministicSubsystemFile(today, instructionPath, s, scan, s.sourceFiles)
    );
  }

  const instructionTargets = opts.instructionTargets ?? [];
  injectDeterministicRootFiles(
    today,
    scan,
    plan,
    files,
    undefined,
    opts.slimRoot === true ? { slimRoot: true } : undefined,
    instructionTargets,
    opts.projectMetadata
  );
  appendCursorRuleFiles(plan, files, instructionTargets);

  // Passes=1 to indicate "one deterministic run"; usage/cost are zero.
  const usage: LLMUsage = { inputTokens: 0, outputTokens: 0 };
  const passes = 1;
  return { files, usage, costUSD: 0, passes, plan };
}
