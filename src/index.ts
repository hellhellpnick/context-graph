// Programmatic API — for embedding context-graph in other tools
export {
  loadConfig,
  initConfig,
  initConfigInteractive,
  getModelMaxTokens,
  MODEL_MAX_OUTPUT_TOKENS,
  providerAllowsMissingApiKey,
} from './config';
export type { Config, ContextDepth } from './config';

export { scanProject, formatForLLM, classifyFile, scanForPromptDepth } from './scanner';
export type { ScannedFile, ScanResult } from './scanner';

export { buildGraph, buildGraphMultiPass, estimateCost, parseBuildPlan, repairBuildPlan } from './graph-builder';
export type { BuildMode, BuildOptions, GraphResult, MultiPassResult, BuildPlan, BuildPlanItem, BuildCallbacks } from './graph-builder';

export { parseOutputFiles, writeOutputFiles } from './writer';
export type { OutputFile, WriteResult } from './writer';

export {
  installPrePushHook,
  saveLastBuildRef,
  getChangedFilesSinceLastBuild,
  filterSignificantFiles,
} from './hooks';

export { createProvider } from './providers';
export type { LLMProvider, LLMMessage, LLMUsage, LLMResponse, ProviderConfig } from './providers';

export { matchAgents, fetchAgents, writeAgents } from './agents';
export type { FetchedAgent, AgentsWriteResult } from './agents';
export { AGENTS_CATALOG, MAX_RECOMMENDED_AGENTS } from './agents-catalog';
export type { AgentEntry, AgentMatchRule } from './agents-catalog';
