import type { SubsystemGrouping, SubsystemLayout } from '../config';
import type { InstructionTargetId } from '../instruction-targets';
import type { MetadataProjectSettings } from './deterministic/metadata';
import type { LLMUsage } from '../providers/types';
import type { OutputFile } from '../writer';

export type BuildMode = 'BUILD' | 'ACTUALIZE' | 'REVIEW' | 'IMPACT';

export interface BuildOptions {
  changedFiles?: string[];
  targetFile?: string;
  existingGraphDir?: string;
}

export interface GraphResult {
  files: OutputFile[];
  rawResponse: string;
  usage: LLMUsage;
  costUSD: number | null;
}

export interface MultiPassResult {
  files: OutputFile[];
  usage: LLMUsage;
  costUSD: number | null;
  passes: number;
  /** Always present after Pass 0: parsed plan merged with scan coverage (no missing source files). */
  plan: BuildPlan;
}

/** Options for `repairBuildPlan` gap-fill / deterministic subsystem layout. */
export interface RepairBuildPlanOptions {
  subsystemGrouping?: SubsystemGrouping;
  maxFilesPerFolderSubsystem?: number;
  /** `mirror` (default): paths under `.github/instructions/` mirror the repo. `canonical`: legacy core/infra. */
  subsystemLayout?: SubsystemLayout;
}

export interface DeterministicBuildOptions {
  /**
   * Whether to generate smaller root files (mirrors `contextDepth: slim` behavior),
   * i.e. do not request index.md/metadata.json from LLM. Here it only affects
   * the shape of root outputs when callers want to mimic slim output.
   */
  slimRoot?: boolean;
  /** Merged into repairBuildPlan (e.g. subsystemGrouping for fewer instruction files). */
  repair?: RepairBuildPlanOptions;
  /** Tool adapters to emit (from `.context-graph.json` / prompt). */
  instructionTargets?: InstructionTargetId[];
  /** Written into `.github/instructions/metadata.json` → `project`. */
  projectMetadata?: MetadataProjectSettings;
}

export interface BuildPlanItem {
  /** Relative path inside .github/instructions/, e.g. "core/scanner.instructions.md" */
  file: string;
  area: string;
  priority: 'P0' | 'P1' | 'P2';
  sourceFiles: string[];
  /** Glob for frontmatter applyTo, e.g. "src/scanner.ts" */
  applyTo: string;
  /** 3–6 specific developer tasks where Copilot needs this file */
  useCases: string[];
  description: string;
}

export interface BuildPlan {
  projectName: string;
  projectDescription: string;
  techStack: string[];
  buildCommand?: string;
  testCommand?: string;
  subsystems: BuildPlanItem[];
}

export interface BuildCallbacks {
  onPlanReady?: (plan: BuildPlan) => void;
  onPassComplete?: (pass: number, totalPasses: number, label: string, files: OutputFile[], cost: number | null) => void;
}

export interface HybridBuildOptions {
  /**
   * Max number of subsystems to enrich with LLM notes. Remaining subsystems are deterministic-only.
   * Keep this small for local models and fast runs.
   */
  maxSubsystems?: number;
  /** "subsystem" = one notes block; "exports" = notes per exported symbol under ## Signatures */
  notesMode?: 'subsystem' | 'exports';
}

