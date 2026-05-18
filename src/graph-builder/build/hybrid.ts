import path from 'path';
import type { Config } from '../../config';
import type { ScanResult } from '../../scanner';
import type { OutputFile } from '../../writer';
import { scanForPromptDepth } from '../../scanner';
import type { BuildCallbacks, HybridBuildOptions, MultiPassResult } from '../types';
import { createProvider } from '../../providers';
import { repairBuildPlan, resolveRepairOptions } from '../plan/repair';
import { appendCursorRuleFiles } from '../deterministic/cursor-rules';
import { injectDeterministicRootFiles } from '../deterministic/root';
import { buildDeterministicSubsystemFile } from '../deterministic/subsystem';
import { extractExports } from '../extract/exports';
import { loadSystemPrompt } from '../prompt';
import {
  buildSnippetForFiles,
  buildNotesPrompt,
  buildExportNotesPrompt,
  extractExportNamesForNotes,
  insertExportNotesUnderSignatures,
  insertNotesSection,
} from '../llm/notes';
import { sanitizeMermaidBlocks } from '../llm/validate';
import { estimateCost } from '../cost';

export async function buildGraphHybrid(
  scan: ScanResult,
  config: Config,
  callbacks: BuildCallbacks = {},
  opts: HybridBuildOptions = {}
): Promise<MultiPassResult> {
  const { onPlanReady, onPassComplete } = callbacks;
  const systemPrompt = loadSystemPrompt();
  const provider = createProvider(config.provider);
  const today = new Date().toISOString().slice(0, 10);

  const maxSubsystems = Math.max(0, Math.min(50, opts.maxSubsystems ?? 2));
  const notesMode: 'subsystem' | 'exports' = opts.notesMode ?? 'subsystem';

  const scanFull = scan;
  const scanPrompt = config.contextDepth === 'slim' ? scanForPromptDepth(scanFull, 'slim') : scanFull;

  // Deterministic plan (no LLM planning pass)
  const plan = repairBuildPlan(scanFull, null, resolveRepairOptions(scanFull, config));
  onPlanReady?.(plan);

  const totalExpected = 1 + 1 + plan.subsystems.length; // "plan" (synthetic) + root + subsystems
  let passes = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;

  // Synthetic pass 0 (plan)
  passes++;
  onPassComplete?.(passes, totalExpected, 'planning (deterministic)', [], 0);

  // Pass 1: deterministic root files (scaffold)
  const allFiles: OutputFile[] = [];
  injectDeterministicRootFiles(
    today,
    scanFull,
    plan,
    allFiles,
    undefined,
    config.contextDepth === 'slim' ? { slimRoot: true } : undefined,
    config.instructionTargets
  );
  passes++;
  onPassComplete?.(passes, totalExpected, 'root files · deterministic', allFiles.filter(f =>
    f.path === '.github/instructions/copilot-instructions.md' ||
    f.path === '.github/instructions/index.md' ||
    f.path === '.github/instructions/context-graph-path-index.md' ||
    f.path === '.github/instructions/metadata.json' ||
    f.path === '.github/instructions/graph-changelog.md' ||
    f.path === '.copilotignore' ||
    f.path === '.github/copilot-instructions.md' ||
    f.path === 'CLAUDE.md' ||
    f.path === 'AGENTS.md'
  ), 0);

  // Root notes (LLM) — snippet-based, inserted into deterministic copilot-instructions.md
  const rootIdx = allFiles.findIndex(f => f.path === '.github/instructions/copilot-instructions.md');
  if (rootIdx >= 0) {
    const rootFile = allFiles[rootIdx];
    const seedFiles = plan.subsystems.flatMap(s => s.sourceFiles).slice(0, 6);
    const snippet = buildSnippetForFiles(scanFull, seedFiles, 9000);
    const exportsBlock = plan.subsystems.slice(0, 10).map(s => `- ${s.area}: ${s.sourceFiles.join(', ')}`).join('\n');
    const prompt = buildNotesPrompt(config, 'root', plan.projectName || 'Project', exportsBlock, snippet);
    const resp = await provider.complete(systemPrompt, [{ role: 'user', content: prompt }]);
    passes++;
    totalInput += resp.usage.inputTokens;
    totalOutput += resp.usage.outputTokens;
    const cost = estimateCost(config.provider.model, resp.usage);
    if (cost !== null) totalCost += cost;
    rootFile.content = insertNotesSection(rootFile.content, resp.content, 'Architecture Overview');
    allFiles[rootIdx] = { ...rootFile, content: sanitizeMermaidBlocks(rootFile.content) };
    onPassComplete?.(passes, totalExpected, 'root notes', [allFiles[rootIdx]], cost);
  }

  // Subsystems: deterministic file + optional LLM notes for top N (default 2)
  const selected = plan.subsystems
    .slice()
    .sort((a, b) => (a.priority === b.priority ? a.file.localeCompare(b.file) : a.priority.localeCompare(b.priority)))
    .slice(0, maxSubsystems);
  const selectedSet = new Set(selected.map(s => s.file));

  for (const s of plan.subsystems) {
    const instructionPath = `.github/instructions/${s.file}`;
    let det = buildDeterministicSubsystemFile(today, instructionPath, s, scanFull, s.sourceFiles);
    passes++;
    allFiles.push(det);
    onPassComplete?.(passes, totalExpected, `${s.file} · deterministic`, [det], 0);

    if (!selectedSet.has(s.file) || maxSubsystems === 0) continue;

    const snippet = buildSnippetForFiles(scanFull, s.sourceFiles, 7000);
    const exportsBlock = extractExports(scanFull, s.sourceFiles);
    const exportNames = extractExportNamesForNotes(scanFull, s.sourceFiles);
    const prompt = notesMode === 'exports'
      ? buildExportNotesPrompt(config, s.area, exportNames, snippet)
      : buildNotesPrompt(config, 'subsystem', s.area, exportsBlock, snippet);
    const resp = await provider.complete(systemPrompt, [{ role: 'user', content: prompt }]);
    passes++;
    totalInput += resp.usage.inputTokens;
    totalOutput += resp.usage.outputTokens;
    const cost = estimateCost(config.provider.model, resp.usage);
    if (cost !== null) totalCost += cost;

    det = {
      ...det,
      content: notesMode === 'exports'
        ? insertExportNotesUnderSignatures(det.content, resp.content)
        : insertNotesSection(det.content, resp.content, 'Overview'),
    };
    det.content = sanitizeMermaidBlocks(det.content);
    allFiles[allFiles.length - 1] = det;
    onPassComplete?.(passes, totalExpected, `${s.file} · notes`, [det], cost);
  }

  appendCursorRuleFiles(plan, allFiles, config.instructionTargets);

  return {
    files: allFiles,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
    costUSD: totalCost > 0 ? totalCost : 0,
    passes,
    plan,
  };
}
