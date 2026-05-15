import type { ScanResult } from '../../scanner';
import type { BuildPlan } from '../types';
import { OUTPUT_FORMAT_INSTRUCTION } from '../constants';
import { styleDirective } from '../prompt';
import { formatForLLM } from '../../scanner';
import { buildDeterministicCopilotInstructions } from '../deterministic/root';
import {
  buildContextGraphPathIndexMd,
  buildIndexMd,
  buildMetadataJson,
} from '../deterministic/metadata';

export function buildRootPassMessage(
  today: string,
  scanPrompt: ScanResult,
  plan: BuildPlan | undefined,
  scanFull: ScanResult,
  opts?: { slimRoot?: boolean }
): string {
  const slimRoot = opts?.slimRoot ?? false;
  const projectContext = formatForLLM(scanPrompt);

  // When a plan is available, format it as a structured table for root pass
  const indexTableFromPlan = plan
    ? [
      `USE THIS EXACT PLAN for index.md (do not invent new subsystems):`,
      `| Instruction File | Source Files | Priority | Area | Description |`,
      `|---|---|---|---|---|`,
      ...plan.subsystems.map(s =>
        `| [${s.file}](${s.file}) | ${s.sourceFiles.map(f => `\`${f}\``).join(', ')} | ${s.priority} | ${s.area} | ${s.description} |`
      ),
    ].join('\n')
    : [
      `CRITICAL RULES FOR index.md:`,
      `- Create ONE subsystem *.instructions.md entry per significant source file or tightly-coupled module group.`,
      `- Do NOT lump unrelated source files together.`,
      `- The table MUST have exactly these columns: | Instruction File | Source Files | Priority | Area | Description |`,
      `- In the "Source Files" column: list exact file paths (comma-separated, backtick-quoted).`,
      `- EVERY source file listed below MUST appear in exactly one "Source Files" cell.`,
      ``,
      `SOURCE FILES THAT MUST EACH APPEAR IN index.md:`,
      scanFull.files.filter(f => f.tier !== 3 && f.content).map(f => `  ${f.path} [T${f.tier}]`).join('\n'),
    ].join('\n');

  // Navigation hub section for copilot-instructions.md
  const quickNavFromPlan = plan
    ? [
      `IMPORTANT: copilot-instructions.md MUST include a "## Quick Navigation" section as the FIRST section`,
      `(before Architecture Overview). Use this EXACT content — it tells Copilot which file to read for each task:`,
      ``,
      `## Quick Navigation`,
      ...plan.subsystems.map(s => [
        `**${s.area}** → \`.github/instructions/${s.file}\``,
        `  When: ${s.useCases.slice(0, 3).join(' · ')}`,
      ].join('\n')),
    ].join('\n')
    : '';

  // Accurate architecture overview from plan
  const archOverviewFromPlan = plan
    ? [
      `copilot-instructions.md "## Architecture Overview" section MUST list ALL these source files:`,
      ...plan.subsystems.flatMap(s => s.sourceFiles.map(f => `  ${f} — ${s.description}`)),
      `Do NOT omit any file. Do NOT list files not in this list.`,
    ].join('\n')
    : '';

  // Accurate module contracts (no hallucinated exports)
  const moduleContractsRule = [
    `copilot-instructions.md "## Module Contracts" section rules:`,
    `- Only list exports that ACTUALLY EXIST in the source files provided.`,
    `- Do NOT invent function names like "getConfig()" if you don't see "export function getConfig" in the code.`,
    `- Use ONLY names you can find with "export" keyword in the source files below.`,
  ].join('\n');

  const buildCmd = plan?.buildCommand ?? 'yarn build';
  const testCmd = plan?.testCommand ?? 'yarn test';

  const rootFileList = slimRoot
    ? [
      `Generate ONLY these 3 root files (in this order) — SLIM ROOT PASS (local / small models):`,
      `  1. <<<FILE: .github/instructions/copilot-instructions.md>>>`,
      `  2. <<<FILE: .github/instructions/graph-changelog.md>>>`,
      `  3. <<<FILE: .copilotignore>>>`,
      ``,
      `index.md and metadata.json are produced deterministically by the tool after this pass — do NOT output them.`,
    ].join('\n')
    : [
      `Generate ONLY these 5 root files (in this order):`,
      `  1. <<<FILE: .github/instructions/copilot-instructions.md>>>`,
      `  2. <<<FILE: .github/instructions/graph-changelog.md>>>`,
      `  3. <<<FILE: .github/instructions/index.md>>>`,
      `  4. <<<FILE: .github/instructions/metadata.json>>>`,
      `  5. <<<FILE: .copilotignore>>>`,
    ].join('\n');

  const instruction = [
    `Run MODE: BUILD on the following project.`,
    `Today's date: ${today}`,
    ...(plan ? [`Project: ${plan.projectName} — ${plan.projectDescription}`, `Stack: ${plan.techStack.join(', ')}`] : []),
    ``,
    // This pass is used by cloud/full LLM mode. Keep it compact if configured.
    // (Hybrid notes use a separate prompt path.)
    `IMPORTANT — THIS IS THE ROOT FILES PASS OF A MULTI-PASS BUILD:`,
    rootFileList,
    ``,
    ...(quickNavFromPlan ? [quickNavFromPlan, ``] : []),
    ...(archOverviewFromPlan ? [archOverviewFromPlan, ``] : []),
    moduleContractsRule,
    ``,
    `copilot-instructions.md "## Environment" section MUST use:`,
    `  Build: \`${buildCmd}\``,
    `  Test: \`${testCmd}\``,
    `  (Use these exact commands — do NOT substitute npm for yarn or vice versa.)`,
    ``,
    `copilot-instructions.md "## Data Flow" section MUST trace the ACTUAL call chain:`,
    `  CLI entry → loadConfig() → scanProject() → buildGraphMultiPass() → parseOutputFiles() → writeOutputFiles()`,
    `  Represent this accurately. Do NOT invent intermediate steps that don't exist.`,
    ``,
    indexTableFromPlan,
    ``,
    `DO NOT generate any *.instructions.md subsystem files now — those come in separate passes.`,
    `Use "${today}" as the build date everywhere (replace all YYYY-MM-DD).`,
    `Start your response immediately with <<<FILE: .github/instructions/copilot-instructions.md>>>.`,
  ].join('\n');

  return `${OUTPUT_FORMAT_INSTRUCTION}\n${instruction}\n\n${projectContext}`;
}

