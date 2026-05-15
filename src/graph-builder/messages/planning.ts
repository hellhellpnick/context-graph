import type { ScanResult } from '../../scanner';
import { buildPlanningContextLight } from '../plan/infer';
import { OUTPUT_FORMAT_INSTRUCTION } from '../constants';

export function buildPlanningPassMessage(scan: ScanResult): string {
  const today = new Date().toISOString().slice(0, 10);
  const fileList = scan.files
    .filter(f => f.tier !== 3 && f.content)
    .map(f => `  ${f.path} [T${f.tier}, ${f.lines} lines]`)
    .join('\n');

  const totalFiles = scan.files.filter(f => f.tier !== 3 && f.content).length;

  return [
    `You are a senior software architect analyzing a codebase to design an optimal AI instruction graph.`,
    `Today's date: ${today}`,
    ``,
    `TASK: Output a JSON build plan for the instruction graph. Raw JSON only — no prose, no code fences.`,
    ``,
    `RULES FOR THE PLAN:`,
    `- Create ONE subsystem entry per logical concern. 1 source file = 1 entry (ideal).`,
    `- NEVER group unrelated modules together. Smaller, focused files are always better.`,
    `- Exception: files in the same directory that form ONE coherent API may be grouped`,
    `  (e.g., providers/index.ts + providers/openai.ts + providers/anthropic.ts + providers/types.ts`,
    `   → one entry "infra/providers.instructions.md" with applyTo: "src/providers/**").`,
    `- "useCases": list 4–6 specific developer tasks where GitHub Copilot would need to read this file.`,
    `  Be concrete: "debugging why gpt-4o returns 400" not "working with providers".`,
    `- "applyTo": glob for VS Code to auto-attach. Single file → exact path. Directory → "src/dir/**".`,
    `- "priority": P0=always needed (core config, entry), P1=frequently needed, P2=rarely needed.`,
    ``,
    `MANDATORY SELF-CHECK before outputting:`,
    `  (A) Count files in SOURCE FILES list below: ${totalFiles} files.`,
    `  (B) Count total sourceFiles entries across ALL subsystems in your plan.`,
    `  (C) A must equal B. If not, add missing files to appropriate subsystems.`,
    `  (D) No file may appear in more than one sourceFiles array.`,
    `  If checks fail — fix plan before outputting.`,
    ``,
    `OUTPUT FORMAT (raw JSON only):`,
    `{`,
    `  "projectName": "...",`,
    `  "projectDescription": "one sentence",`,
    `  "techStack": ["TypeScript", "Node.js", "..."],`,
    `  "buildCommand": "...",`,
    `  "testCommand": "...",`,
    `  "subsystems": [`,
    `    {`,
    `      "file": "core/scanner.instructions.md",`,
    `      "area": "File Scanner",`,
    `      "priority": "P1",`,
    `      "sourceFiles": ["src/scanner.ts"],`,
    `      "applyTo": "src/scanner.ts",`,
    `      "useCases": [`,
    `        "debugging why a specific file is being skipped during scan",`,
    `        "adding a new file tier classification rule",`,
    `        "understanding how token budget limits work",`,
    `        "modifying what gets included in the LLM context"`,
    `      ],`,
    `      "description": "Tier-based project scanner with token budget management"`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `SOURCE FILES TO COVER (${totalFiles} files — every one must appear in sourceFiles):`,
    fileList,
    ``,
    `## Project Context (structure + config excerpts only — subsystem passes receive full source):`,
    buildPlanningContextLight(scan),
  ].join('\n');
}
