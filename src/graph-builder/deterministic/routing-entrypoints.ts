import fs from 'fs';
import path from 'path';
import type { InstructionTargetId } from '../../instruction-targets';
import { isInstructionTargetEnabled } from '../../instruction-targets';
import { ROUTING_MANDATE_HEADING } from './routing-mandate';

/** Minimum markers every full routing entry file must contain. */
export const ROUTING_MANDATE_MARKERS = [
  ROUTING_MANDATE_HEADING,
  'symbol-index',
  'FORBIDDEN',
] as const;

/** Paths checked when the corresponding instruction target is enabled. */
export const ROUTING_ENTRYPOINTS_BY_TARGET: Record<InstructionTargetId, readonly string[]> = {
  copilot: ['.github/copilot-instructions.md'],
  cursor: ['.cursor/rules/context-graph.mdc'],
  claude: ['CLAUDE.md'],
  agents: [],
  gemini: ['GEMINI.md'],
  windsurf: ['.windsurf/rules/context-graph.md'],
  codex: ['.codex/context-graph.md'],
  cline: ['.clinerules/context-graph.md'],
};

/** Always emitted with the instruction graph (any agent should read). */
export const ROUTING_CORE_ENTRYPOINTS = [
  '.github/instructions/copilot-instructions.md',
  'AGENTS.md',
] as const;

export interface RoutingEntrypointIssue {
  relPath: string;
  kind: 'missing' | 'weak';
  detail?: string;
}

export function routingContentHasMandate(content: string): boolean {
  return ROUTING_MANDATE_MARKERS.every(m => content.includes(m));
}

export function collectExpectedRoutingEntrypoints(
  instructionTargets: InstructionTargetId[]
): string[] {
  const out = new Set<string>(ROUTING_CORE_ENTRYPOINTS);
  const targets =
    instructionTargets.length > 0 ? instructionTargets : (Object.keys(ROUTING_ENTRYPOINTS_BY_TARGET) as InstructionTargetId[]);
  for (const id of targets) {
    if (!isInstructionTargetEnabled(targets, id)) continue;
    for (const p of ROUTING_ENTRYPOINTS_BY_TARGET[id]) out.add(p);
  }
  return [...out].sort();
}

export function auditRoutingEntrypoints(
  projectRoot: string,
  instructionTargets: InstructionTargetId[]
): RoutingEntrypointIssue[] {
  const issues: RoutingEntrypointIssue[] = [];
  for (const relPath of collectExpectedRoutingEntrypoints(instructionTargets)) {
    const abs = path.join(projectRoot, relPath);
    if (!fs.existsSync(abs)) {
      issues.push({ relPath, kind: 'missing' });
      continue;
    }
    const content = fs.readFileSync(abs, 'utf8');
    if (!routingContentHasMandate(content)) {
      issues.push({
        relPath,
        kind: 'weak',
        detail: `missing one of: ${ROUTING_MANDATE_MARKERS.join(', ')}`,
      });
    }
  }
  return issues;
}
