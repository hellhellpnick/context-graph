#!/usr/bin/env node
/**
 * Split src/graph-builder.ts → src/graph-builder/** (line-accurate).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const lines = fs.readFileSync(path.join(ROOT, 'src/graph-builder.ts'), 'utf8').split('\n');

function L(a, b) {
  return lines.slice(a - 1, b).join('\n');
}

function exportFunctions(code) {
  return code
    .replace(/^function /gm, 'export function ')
    .replace(/^const ([A-Z_][A-Z0-9_]*) = /gm, 'export const $1 = ')
    .replace(/^interface /gm, 'export interface ');
}

function write(rel, header, body, opts = {}) {
  const { exportFns = true, extra = '' } = opts;
  let code = body;
  if (exportFns) code = exportFunctions(code);
  const p = path.join(ROOT, 'src/graph-builder', rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, [header, code, extra].filter(Boolean).join('\n\n') + '\n');
  console.log('wrote', rel, body.split('\n').length, 'lines');
}

// types.ts — already exported in source
write('types.ts', '', L(36, 120), { exportFns: false });

write(
  'constants.ts',
  '/** Shared constants for graph-builder. */',
  [
    'export ' + L(129, 151).replace(/^const /, 'const '),
    L(964, 1017)
      .split('\n')
      .map(l => (l.startsWith('const ') ? 'export ' + l : l))
      .join('\n'),
    'export ' + L(1221, 1231).trim(),
    'export const MAX_MIRROR_INSTRUCTION_REL_LEN = 200;',
    'export const SOURCE_EXT_RE = /\\.(ts|tsx|js|jsx|mjs|cjs|vue|py|go|rs|java|kt|cs|rb|php)$/i;',
    'export ' + L(2867, 2882).trim(),
  ].join('\n\n'),
  { exportFns: false }
);

write(
  'prompt.ts',
  `import fs from 'fs';
import path from 'path';
import type { Config } from '../config';`,
  [L(122, 127), L(153, 186)].join('\n\n')
);

write(
  'extract/exports.ts',
  `import ts from 'typescript';
import path from 'path';
import type { ScanResult } from '../scanner';
import {
  extractGoSymbolLines,
  extractPhpSymbolLines,
  extractPythonSymbolLines,
  extractScriptSkeleton,
  extractVueComputedBranches,
  extractVuePropKeys,
  extractVueScriptCombined,
  extractVueSymbolLines,
  extractVueTemplateBrief,
  scriptOrSelfForAnalysis,
} from '../source-extract';
import {
  detectFrameworks,
  extractCSharpSymbolLines,
  extractRuntimeSection,
} from '../framework-extract';`,
  [L(191, 430), 'export const DETERMINISTIC_SOURCE_MAX_LINES = 120;', L(435, 521)].join('\n\n')
);

write(
  'extract/imports.ts',
  `import path from 'path';
import type { ScanResult } from '../scanner';
import { scriptOrSelfForAnalysis } from '../source-extract';
import {
  extractGoImports,
  extractPhpUseStatements,
  extractPythonImports,
} from '../source-extract';`,
  L(523, 624)
);

write(
  'extract/deps-graph.ts',
  `import path from 'path';
import ts from 'typescript';
import type { ScanResult } from '../scanner';
import { scriptOrSelfForAnalysis } from '../source-extract';
import { SOURCE_EXT_RE } from '../constants';
import { fileReadsEnvironment } from '../prompt';`,
  L(628, 819)
);

write('extract/misc.ts', '', L(821, 874));

write('plan/parse.ts', '', L(944, 959));

write(
  'plan/infer.ts',
  `import type { ScanResult } from '../scanner';
import type { BuildPlan } from '../types';`,
  [L(879, 942), L(1079, 1193)].join('\n\n')
);

write(
  'plan/layout.ts',
  `import crypto from 'crypto';
import path from 'path';
import type { ScanResult } from '../scanner';
import type { BuildPlan, BuildPlanItem, RepairBuildPlanOptions } from '../types';
import {
  DIR_TO_INSTRUCTION_PREFIX,
  MAX_FILES_PER_FOLDER_SUBSYSTEM_DEFAULT,
  MAX_MIRROR_INSTRUCTION_REL_LEN,
  MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_DEFAULT,
  SPLIT_DIRS,
} from '../constants';
import { needsOwnInstructionFile } from '../../framework-extract';`,
  [L(1195, 1337), L(1339, 1369)].join('\n\n')
);

write(
  'plan/repair.ts',
  `import path from 'path';
import type { Config } from '../config';
import type { ScanResult } from '../scanner';
import type { BuildPlan, BuildPlanItem, RepairBuildPlanOptions } from '../types';
import {
  CANONICAL_GROUPS,
  INSTRUCTION_EXCLUDE_RE,
} from '../constants';
import { partitionInstructionChunks, groupPathsIntoAutoSubsystems } from './layout';
import { inferDefaultsFromScan } from './infer';`,
  [L(1019, 1077), L(1246, 1259), L(1371, 1470), L(1483, 1536)].join('\n\n')
);

write(
  'deterministic/metadata.ts',
  '',
  L(1917, 2023)
);

write(
  'deterministic/root.ts',
  `import path from 'path';
import type { ScanResult } from '../scanner';
import type { BuildPlan } from '../types';
import type { OutputFile } from '../writer';
import { SOURCE_EXT_RE } from '../constants';
import { fileReadsEnvironment } from '../prompt';
import { buildDeterministicDependencyGraph } from '../extract/deps-graph';
import {
  buildContextGraphPathIndexMd,
  buildIndexMd,
  buildMetadataJson,
} from './metadata';
import { mergeLlmProse } from '../llm/validate';`,
  [L(1543, 1763), L(1792, 1912)].join('\n\n')
);

write(
  'deterministic/subsystem.ts',
  `import path from 'path';
import type { ScanResult } from '../scanner';
import type { BuildPlanItem } from '../types';
import type { OutputFile } from '../writer';
import {
  extractExports,
  buildDeterministicSourceSection,
  buildVueMermaidNodes,
} from '../extract/exports';
import { extractImports } from '../extract/imports';
import { isBarrelFile, extractCliCommands, extractFilePurpose } from '../extract/misc';
import {
  extractDeterministicErrorsForFile,
  extractRuntimeSection,
  extractSideEffectsForFile,
} from '../../framework-extract';`,
  L(2435, 2675)
);

write(
  'llm/validate.ts',
  `import path from 'path';
import ts from 'typescript';
import type { ScanResult } from '../scanner';
import type { BuildPlanItem } from '../types';
import type { OutputFile } from '../writer';
import {
  extractGoSymbolLines,
  extractPhpSymbolLines,
  extractPythonSymbolLines,
  extractVuePropKeys,
  scriptOrSelfForAnalysis,
} from '../source-extract';`,
  [L(1765, 1790), L(2121, 2142), L(2313, 2433)].join('\n\n')
);

write(
  'llm/notes.ts',
  `import ts from 'typescript';
import type { Config } from '../config';
import type { ScanResult } from '../scanner';
import {
  extractGoSymbolLines,
  extractPhpSymbolLines,
  extractPythonSymbolLines,
  extractVuePropKeys,
  scriptOrSelfForAnalysis,
} from '../source-extract';
import { styleDirective } from '../prompt';
import { insertAfterHeading } from './validate';`,
  [L(2027, 2169), L(2946, 3051)].join('\n\n')
);

write(
  'messages/planning.ts',
  `import type { ScanResult } from '../scanner';
import { buildPlanningContextLight } from '../plan/infer';
import { OUTPUT_FORMAT_INSTRUCTION } from '../constants';`,
  L(878, 942)
);

write(
  'messages/root.ts',
  `import type { ScanResult } from '../scanner';
import type { BuildPlan } from '../types';
import { OUTPUT_FORMAT_INSTRUCTION } from '../constants';
import { styleDirective } from '../prompt';
import { formatForLLM } from '../scanner';
import { buildDeterministicCopilotInstructions } from '../deterministic/root';
import {
  buildContextGraphPathIndexMd,
  buildIndexMd,
  buildMetadataJson,
} from '../deterministic/metadata';`,
  L(2173, 2289)
);

write(
  'messages/subsystem.ts',
  `import type { ScanResult } from '../scanner';
import type { BuildPlanItem } from '../types';
import { OUTPUT_FORMAT_INSTRUCTION } from '../constants';
import { extractExports } from '../extract/exports';
import { formatForLLM } from '../scanner';`,
  [L(2291, 2433), L(2677, 2810)].join('\n\n')
);

write('discovery.ts', '', L(2818, 2863));

write(
  'cost.ts',
  `import type { LLMUsage } from '../providers/types';
import { PRICING } from './constants';`,
  L(2884, 2893)
);

write(
  'build/deterministic.ts',
  `import type { ScanResult } from '../scanner';
import type { OutputFile } from '../writer';
import type { LLMUsage } from '../providers/types';
import type { DeterministicBuildOptions, MultiPassResult } from '../types';
import { repairBuildPlan } from '../plan/repair';
import { injectDeterministicRootFiles } from '../deterministic/root';
import { buildDeterministicSubsystemFile } from '../deterministic/subsystem';`,
  L(2918, 2944)
);

write(
  'build/single.ts',
  `import type { Config } from '../config';
import type { ScanResult } from '../scanner';
import type { BuildMode, BuildOptions, GraphResult } from '../types';
import { createProvider } from '../providers';
import { parseOutputFiles } from '../writer';
import { loadSystemPrompt } from '../prompt';
import { buildUserMessage } from '../messages/subsystem';
import { estimateCost } from '../cost';`,
  L(2898, 2912)
);

write(
  'build/hybrid.ts',
  `import path from 'path';
import type { Config } from '../config';
import type { ScanResult } from '../scanner';
import type { OutputFile } from '../writer';
import { scanForPromptDepth } from '../scanner';
import type { BuildCallbacks, HybridBuildOptions, MultiPassResult } from '../types';
import { createProvider } from '../providers';
import { repairBuildPlan, repairOptionsFromConfig } from '../plan/repair';
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
import { estimateCost } from '../cost';`,
  L(3060, 3173)
);

write(
  'build/multipass.ts',
  `import path from 'path';
import type { Config } from '../config';
import type { ScanResult } from '../scanner';
import { scanForPromptDepth } from '../scanner';
import type { BuildCallbacks, MultiPassResult, BuildPlanItem } from '../types';
import type { OutputFile } from '../writer';
import { createProvider } from '../providers';
import { parseOutputFiles } from '../writer';
import { parseBuildPlan } from '../plan/parse';
import { repairBuildPlan, repairOptionsFromConfig } from '../plan/repair';
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
import { estimateCost } from '../cost';`,
  L(3176, 3331)
);

// plan/repair needs repairOptionsFromConfig - was in L(1471-1480) - included in slice?

const index = `/**
 * Graph builder — modular layout (split from monolithic graph-builder.ts).
 */
export * from './types';
export { repairBuildPlan, repairOptionsFromConfig } from './plan/repair';
export { parseBuildPlan } from './plan/parse';
export { buildGraphDeterministic } from './build/deterministic';
export { buildGraph } from './build/single';
export { buildGraphHybrid } from './build/hybrid';
export { buildGraphMultiPass } from './build/multipass';
export { estimateCost } from './cost';
`;

fs.writeFileSync(path.join(ROOT, 'src/graph-builder/index.ts'), index);

console.log('done — replace src/graph-builder.ts with re-export barrel');
