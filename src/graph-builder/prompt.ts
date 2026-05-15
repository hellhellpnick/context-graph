import fs from 'fs';
import path from 'path';
import type { Config } from '../config';

/** Node / Python / Rust / PHP env access heuristics for Danger Zone + mermaid. */
export function fileReadsEnvironment(content: string): boolean {
  return /process\.env|os\.environ|os\.getenv\s*\(|std::env|getenv\s*\(|(?:^|[^\w$.])env\s*\(\s*['"][^'"]+['"]|(?:^|[^\w$])\$_ENV(?:\[|\b)|(?:^|[^\w$])\$_SERVER\s*\[/i.test(
    content
  );
}

export function styleDirective(config: Config, target: 'notes' | 'root' | 'subsystem'): string {
  if (config.outputStyle !== 'compact') return '';
  if (target === 'notes') {
    return [
      `STYLE: ULTRA-COMPACT.`,
      `- Max 10 bullets total.`,
      `- Each bullet <= 18 words.`,
      `- No filler, no greetings, no "sure".`,
    ].join('\n');
  }
  return [
    `STYLE: COMPACT.`,
    `- Dense bullets, minimal prose.`,
    `- Prefer lists/tables over paragraphs.`,
    `- Avoid repeating obvious code; add only intent + gotchas.`,
  ].join('\n');
}

export function loadSystemPrompt(): string {
  const candidates = [
    path.join(__dirname, '../../prompts/graph-create-agent.md'),
    path.join(__dirname, '../../../graph-create-agent.md'),
    path.join(process.cwd(), 'graph-create-agent.md'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error('context-graph system prompt not found. Try reinstalling the package.');
}

export function loadExistingGraph(graphDir: string): string {
  const rootFile = path.join(graphDir, 'copilot-instructions.md');
  if (!fs.existsSync(rootFile)) return '';
  return fs.readFileSync(rootFile, 'utf8');
}
