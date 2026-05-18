import path from 'path';
import type { Config } from '../../config';
import type { ScanResult } from '../../scanner';
import { scanForPromptDepth } from '../../scanner';
import type { BuildCallbacks, MultiPassResult, BuildPlanItem } from '../types';
import type { OutputFile } from '../../writer';
import { createProvider } from '../../providers';
import { parseOutputFiles } from '../../writer';
import { parseBuildPlan } from '../plan/parse';
import { repairBuildPlan, resolveRepairOptions } from '../plan/repair';
import { appendCursorRuleFiles } from '../deterministic/cursor-rules';
import { injectDeterministicRootFiles } from '../deterministic/root';
import { buildDeterministicSubsystemFile } from '../deterministic/subsystem';
import { buildPlanningPassMessage } from '../messages/planning';
import { buildRootPassMessage } from '../messages/root';
import { buildSubsystemPassMessage, buildUserMessage } from '../messages/subsystem';
import { parseSubsystemMappings, findMissingSubsystemPaths } from '../discovery';
import {
  sanitizeMermaidBlocks,
  subsystemOutputLooksOk,
  llmContentMatchesRealExports,
  buildSubsystemRepairMessage,
} from '../llm/validate';
import { loadSystemPrompt } from '../prompt';
import { estimateCost } from '../cost';

export async function buildGraphMultiPass(
  scan: ScanResult,
  config: Config,
  callbacks: BuildCallbacks = {}
): Promise<MultiPassResult> {
  const { onPlanReady, onPassComplete } = callbacks;
  const systemPrompt = loadSystemPrompt();
  const provider = createProvider(config.provider);
  const today = new Date().toISOString().slice(0, 10);

  const allFiles: OutputFile[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let passes = 0;

  const scanFull = scan;
  const scanPrompt = config.contextDepth === 'slim' ? scanForPromptDepth(scanFull, 'slim') : scanFull;

  // ── Pass 0: planning ───────────────────────────────────────────────────
  const planMsg = buildPlanningPassMessage(scanFull);
  const planResp = await provider.complete(systemPrompt, [{ role: 'user', content: planMsg }]);
  passes++;
  totalInput += planResp.usage.inputTokens;
  totalOutput += planResp.usage.outputTokens;
  const costPlan = estimateCost(config.provider.model, planResp.usage);
  if (costPlan !== null) totalCost += costPlan;

  const plan = repairBuildPlan(
    scanFull,
    parseBuildPlan(planResp.content),
    resolveRepairOptions(scanFull, config)
  );
  onPlanReady?.(plan);

  // Total expected passes: plan(0) + root(1) + one per subsystem (after coverage repair)
  const subsystemCount = plan.subsystems.length;
  const totalExpected = 1 + 1 + subsystemCount; // plan + root + subsystems

  onPassComplete?.(passes, totalExpected, 'planning', [], costPlan);

  // ── Pass 1: root files ─────────────────────────────────────────────────
  const pass1Msg = buildRootPassMessage(
    today,
    scanPrompt,
    plan,
    scanFull,
    config.contextDepth === 'slim' ? { slimRoot: true } : undefined
  );
  const pass1 = await provider.complete(systemPrompt, [{ role: 'user', content: pass1Msg }]);
  passes++;
  totalInput += pass1.usage.inputTokens;
  totalOutput += pass1.usage.outputTokens;
  const cost1 = estimateCost(config.provider.model, pass1.usage);
  if (cost1 !== null) totalCost += cost1;

  const pass1Files = parseOutputFiles(pass1.content);
  const llmCopilot = pass1Files.find(f => f.path.endsWith('copilot-instructions.md'))?.content;
  injectDeterministicRootFiles(
    today,
    scanFull,
    plan,
    pass1Files,
    llmCopilot,
    config.contextDepth === 'slim' ? { slimRoot: true } : undefined,
    config.instructionTargets
  );
  allFiles.push(...pass1Files);
  onPassComplete?.(passes, totalExpected, 'root files', pass1Files, cost1);

  // ── Determine subsystem passes ─────────────────────────────────────────
  const rootGraphContent = pass1Files.find(f => f.path.endsWith('copilot-instructions.md'))?.content ?? '';

  let pendingSubsystems: Array<{ instructionPath: string; sourceFiles: string[]; planItem?: BuildPlanItem }>;

  if (plan.subsystems.length > 0) {
    pendingSubsystems = plan.subsystems
      .filter(s => !pass1Files.some(f => f.path.endsWith(s.file)))
      .map(s => ({
        instructionPath: `.github/instructions/${s.file}`,
        sourceFiles: s.sourceFiles,
        planItem: s,
      }));
  } else {
    // Fallback: parse from index.md
    const subsystemMappings = parseSubsystemMappings(pass1Files);
    if (subsystemMappings.length > 0) {
      pendingSubsystems = subsystemMappings
        .filter(m => !pass1Files.some(f => f.path === m.instructionPath))
        .map(m => ({ instructionPath: m.instructionPath, sourceFiles: m.sourceFiles }));
    } else {
      pendingSubsystems = findMissingSubsystemPaths(pass1Files).map(p => ({ instructionPath: p, sourceFiles: [] }));
    }
  }

  // ── Pass 2...N: one subsystem file per pass ────────────────────────────
  const compactSubsystem = config.provider.provider === 'ollama' || config.contextDepth === 'slim';

  for (const sub of pendingSubsystems) {
    const { instructionPath, sourceFiles, planItem } = sub;
    const label = instructionPath.replace('.github/instructions/', '');

    const passMsg = buildSubsystemPassMessage(
      today,
      instructionPath,
      rootGraphContent,
      scanPrompt,
      scanFull,
      sourceFiles,
      planItem,
      { compact: compactSubsystem }
    );
    const passResp = await provider.complete(systemPrompt, [{ role: 'user', content: passMsg }]);
    passes++;
    totalInput += passResp.usage.inputTokens;
    totalOutput += passResp.usage.outputTokens;
    let lastCost = estimateCost(config.provider.model, passResp.usage);
    if (lastCost !== null) totalCost += lastCost;

    let passFiles = parseOutputFiles(passResp.content);
    let statusLabel = label;

    if (!subsystemOutputLooksOk(passFiles, instructionPath)) {
      const repairMsg = buildSubsystemRepairMessage(today, instructionPath, planItem);
      const repairResp = await provider.complete(systemPrompt, [{ role: 'user', content: repairMsg }]);
      passes++;
      totalInput += repairResp.usage.inputTokens;
      totalOutput += repairResp.usage.outputTokens;
      const costR = estimateCost(config.provider.model, repairResp.usage);
      if (costR !== null) totalCost += costR;
      passFiles = parseOutputFiles(repairResp.content);
      lastCost = costR;
    }

    // Sanitize mermaid blocks in all parsed LLM files
    for (const pf of passFiles) {
      pf.content = sanitizeMermaidBlocks(pf.content);
    }

    // Fallback to deterministic if parsing failed OR LLM hallucinated content
    const parsedFile = passFiles.find(f =>
      f.path.replace(/\\/g, '/').endsWith(path.posix.basename(instructionPath))
    );
    const hallucinated = parsedFile && sourceFiles.length > 0
      && !llmContentMatchesRealExports(parsedFile.content, scanFull, sourceFiles);

    if (!subsystemOutputLooksOk(passFiles, instructionPath) || hallucinated) {
      passFiles = [
        buildDeterministicSubsystemFile(
          today,
          instructionPath,
          planItem,
          scanFull,
          sourceFiles
        ),
      ];
      lastCost = null;
      statusLabel = hallucinated ? `${label} · deterministic (hallucination rejected)` : `${label} · deterministic`;
    }

    allFiles.push(...passFiles);
    onPassComplete?.(passes, totalExpected, statusLabel, passFiles, lastCost);
  }

  appendCursorRuleFiles(plan, allFiles, config.instructionTargets);

  return {
    files: allFiles,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
    costUSD: totalCost > 0 ? totalCost : null,
    passes,
    plan,
  };
}
