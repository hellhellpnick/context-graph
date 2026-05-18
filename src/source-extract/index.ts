/**
 * Shared helpers for Vue / PHP / Python / Go — scanner + deterministic graph.
 * @module source-extract
 */
export { isMessageOrPromptPath, isExecutableModulePath, isComposableLikePath } from './paths';
export { isPromptTemplateBody, compactTsExportLine } from './ts-prompt';
export { extractScriptSkeleton } from './ts-skeleton';
export {
  instructionSplitScore,
  INSTRUCTION_OWN_FILE_SCORE_THRESHOLD,
} from './instruction-score';
export {
  extractVueScriptCombined,
  scriptOrSelfForAnalysis,
  extractVuePropKeys,
  extractVueSymbolLines,
  extractVueTemplateBrief,
  buildVueRoutingSignatures,
  extractVueComputedBranches,
} from './vue-sfc';
export {
  extractNuxtRuntimeBullets,
  extractDeterministicErrors,
  extractSideEffectBullets,
} from './nuxt-runtime';
export {
  extractPhpSymbolLines,
  extractPhpMethodParamNames,
  extractPhpJsonResponseKeys,
  buildPhpRoutingSignatures,
  buildPhpOneLineSummary,
  extractPhpUseStatements,
} from './php';
export { extractPythonSymbolLines, extractPythonImports } from './python';
export { extractGoImports, extractGoSymbolLines } from './go';
