import type { ScanResult } from '../../scanner';
import { formatForLLM } from '../../scanner';
import type { BuildMode, BuildOptions, BuildPlanItem } from '../types';
import { OUTPUT_FORMAT_INSTRUCTION } from '../constants';
import { extractExports } from '../extract/exports';
import { loadExistingGraph } from '../prompt';

export function buildFocusedContext(scan: ScanResult, sourceFiles: string[], subsystemName: string): string {
  const sourcePaths = new Set(sourceFiles);

  const relevantFiles = scan.files.filter(f => {
    if (!f.content) return false;
    if (f.tier === 0) return true; // always include infra/CI files
    if (sourcePaths.has(f.path)) return true;
    // Fallback when no explicit mapping: match by subsystem name in path
    if (sourceFiles.length === 0 && f.path.toLowerCase().includes(subsystemName.toLowerCase())) return true;
    return false;
  });

  // Re-format with only relevant files; preserve the original tree so the LLM has full navigation context
  const filteredScan: ScanResult = { ...scan, files: relevantFiles };
  return [
    '## Full Project Tree (navigation context)\n',
    scan.tree,
    '\n',
    formatForLLM(filteredScan).replace(/^## Project File Tree[\s\S]*?\n\n/, ''), // strip duplicate tree
  ].join('');
}

export function buildSubsystemPassMessage(
  today: string,
  subsystemPath: string,
  rootGraphContent: string,
  scanPrompt: ScanResult,
  scanFull: ScanResult,
  sourceFiles: string[],
  planItem?: BuildPlanItem,
  passOpts?: { compact?: boolean }
): string {
  const compact = passOpts?.compact ?? false;
  const subsystemName = subsystemPath.replace(/\.instructions\.md$/, '').replace(/^.*\//, '');
  const focusedContext = buildFocusedContext(scanPrompt, sourceFiles, subsystemName);
  const actualExports = extractExports(scanFull, sourceFiles);

  const sourceList = sourceFiles.length > 0
    ? `This file covers: ${sourceFiles.map(f => `\`${f}\``).join(', ')}`
    : `This file covers the "${subsystemName}" subsystem.`;

  const applyToValue = planItem?.applyTo ?? (sourceFiles.length === 1 ? sourceFiles[0] : `src/${subsystemName}*`);
  const useCasesList = planItem?.useCases?.length
    ? planItem.useCases.map(u => `  - ${u}`).join('\n')
    : `  - working with ${subsystemName}`;

  const instruction = [
    `Run MODE: BUILD — SUBSYSTEM PASS.`,
    `Today's date: ${today}`,
    ``,
    `Generate ONLY this ONE file: ${subsystemPath}`,
    `${sourceList}`,
    ``,
    `FRONTMATTER REQUIREMENTS:`,
    `- description: "${planItem?.description ?? `${subsystemName} module documentation`}"`,
    `- applyTo: "${applyToValue}"`,
    `- priority: "${planItem?.priority ?? 'P1'}"`,
    `- last_updated: "${today}"`,
    ``,
    `⚠️  ANTI-HALLUCINATION RULES (violations = wrong instructions = broken AI context):`,
    `- ## Signatures: ONLY document symbols that appear below in "ACTUAL EXPORTS" with the export keyword.`,
    `  Do NOT document private functions, internal constants, or symbols without "export".`,
    `  Do NOT invent parameter names or types — use EXACTLY what you see in the source code.`,
    `- ## Graph: ONLY draw nodes for exported symbols. Internal helpers may appear as anonymous nodes`,
    `  if called by an export, but must NOT be labeled as exported.`,
    ``,
    `ACTUAL EXPORTS (only document these — nothing else):`,
    `\`\`\`typescript`,
    actualExports,
    `\`\`\``,
    ``,
    `MANDATORY SECTIONS (in this order, after frontmatter):`,
    ``,
    `### 1. ## When to Read  ← FIRST section, required for AI navigation`,
    `Copilot reads this section to decide if it needs to open this file.`,
    `List EXACTLY these use cases (from the build plan):`,
    useCasesList,
    ``,
    `### 2. ## Graph`,
    `  - Mermaid call graph. Root node = each exported function/class (use the ACTUAL export names above).`,
    `  - Show call edges between exports. Label edges with what triggers the call.`,
    `  - External module calls → external named nodes (e.g., "glob · npm", "fs · Node.js").`,
    `  - Side effects (file I/O, network, env reads) → {{diamond nodes}}.`,
    `  - Mark 🔴 on edges to Danger Zone dependencies.`,
    ``,
    `### 3. ## Signatures`,
    `  - EVERY exported symbol with FULL TypeScript signature (copy from ACTUAL EXPORTS above).`,
    `  - Expand each signature with: parameter descriptions, return value meaning, optional/required.`,
    `  - For exported types/interfaces: show all fields with their types.`,
    ``,
    `### 4. ## Contracts`,
    `  - Per export: preconditions (what must be true when called), postconditions (what is guaranteed after).`,
    `  - Be specific: "throws Error('context-graph system prompt not found')" not "throws on missing file".`,
    ``,
    `### 5. ## Error Handling`,
    `  - Every throw/reject with: error class, exact message string, triggering conditions.`,
    ``,
    `### 6. ## Danger Zone 🔴`,
    `  - Every external dependency, file I/O path, network endpoint, env variable.`,
    `  - Per item: what fails if unavailable, what the user sees.`,
    ``,
    `STYLE RULES:`,
    `- Dense, precise bullet points. No padding sentences.`,
    compact
      ? `- LOCAL/SMALL MODEL: keep the ENTIRE file under ~100 lines; short bullets; still use correct FILE/EOF delimiters.`
      : `- Target 80–150 lines total. If a file has many exports, document each briefly but completely.`,
    ``,
    `## Root Graph (architectural context — do not copy):`,
    `\`\`\``,
    rootGraphContent.slice(0, compact ? 900 : 2500),
    `\`\`\``,
    ``,
    `## Source Files (read every line — your primary input):`,
    `Start your response immediately with <<<FILE: ${subsystemPath}>>>.`,
  ].join('\n');

  return `${OUTPUT_FORMAT_INSTRUCTION}\n${instruction}\n\n${focusedContext}`;
}

export function buildUserMessage(mode: BuildMode, scan: ScanResult, opts: BuildOptions): string {
  const projectContext = formatForLLM(scan);
  const today = new Date().toISOString().slice(0, 10);

  let modeSection = '';
  switch (mode) {
    case 'ACTUALIZE': {
      const changedList = opts.changedFiles?.join('\n') ?? '(unknown — re-scan all)';
      const existingGraph = opts.existingGraphDir ? loadExistingGraph(opts.existingGraphDir) : '';
      modeSection = [
        `Run MODE: ACTUALIZE on the following project.`,
        `Today's date: ${today}`,
        ``,
        `IMPORTANT INSTRUCTIONS:`,
        `- Do NOT output the ACTUALIZE TODO checklist.`,
        `- Do NOT output any prose outside the file blocks.`,
        `- Generate only the files that need to change as complete <<<FILE:>>> blocks.`,
        `- Use "${today}" as the updated date everywhere.`,
        ``,
        `Files changed since last build:`,
        changedList,
        existingGraph ? `\n## Existing copilot-instructions.md\n\`\`\`\n${existingGraph}\n\`\`\`` : '',
      ].join('\n');
      break;
    }
    case 'REVIEW':
      modeSection = `Run MODE: REVIEW on the following project. Report accuracy.\nToday's date: ${today}\nOutput a single <<<FILE: .context-graph-report.md>>> block with the report inside.`;
      break;
    case 'IMPACT':
      modeSection = `Run MODE: IMPACT for file: ${opts.targetFile ?? '(unknown)'}\nToday's date: ${today}\nOutput a single <<<FILE: .context-graph-report.md>>> block with the impact analysis inside.`;
      break;
    default:
      modeSection = `Run MODE: BUILD on the following project.\nToday's date: ${today}`;
  }

  return `${OUTPUT_FORMAT_INSTRUCTION}\n${modeSection}\n\n${projectContext}`;
}
