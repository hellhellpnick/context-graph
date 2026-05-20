import path from 'path';
import ts from 'typescript';
import type { ScanResult } from '../../scanner';
import type { BuildPlanItem } from '../types';
import type { OutputFile } from '../../writer';
import { OUTPUT_FORMAT_INSTRUCTION } from '../constants';
import {
  extractCSharpSymbolLines,
  extractGoSymbolLines,
  extractJavaKotlinSymbolLines,
  extractPhpSymbolLines,
  extractPythonSymbolLines,
  extractRubySymbolLines,
  extractRustSymbolLines,
  extractVuePropKeys,
  scriptOrSelfForAnalysis,
} from '../../source-extract';

export function mergeLlmProse(skeleton: string, llmContent: string): string {
  if (!llmContent || llmContent.length < 100) return skeleton;

  const extractSection = (text: string, heading: string): string | null => {
    const re = new RegExp(`^## ${heading}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |\\Z)`, 'm');
    const m = re.exec(text);
    if (!m || m[1].trim().length < 30) return null;
    return m[1].trim();
  };

  let result = skeleton;

  const proseHeadings = ['Architecture Overview', 'Data Flow', 'Danger Zones'];
  for (const heading of proseHeadings) {
    const llmSection = extractSection(llmContent, heading);
    if (!llmSection) continue;
    const skelSection = extractSection(result, heading);
    if (!skelSection) continue;
    // Replace skeleton section with LLM version if it's meaningfully longer
    if (llmSection.length > skelSection.length * 1.3) {
      result = result.replace(skelSection, llmSection);
    }
  }

  return result;
}

export function insertAfterHeading(md: string, heading: string, insert: string): string {
  const re = new RegExp(`^## ${heading}\\b[^\\n]*\\n`, 'm');
  const m = re.exec(md);
  if (!m) return md + '\n\n' + insert;
  const insertAt = m.index + m[0].length;
  return md.slice(0, insertAt) + '\n' + insert + '\n' + md.slice(insertAt);
}

export function subsystemOutputLooksOk(files: OutputFile[], instructionPath: string): boolean {
  const norm = instructionPath.replace(/\\/g, '/');
  const base = path.posix.basename(norm);
  return files.some(f => {
    const fp = f.path.replace(/\\/g, '/');
    return fp === norm || fp.endsWith(`/${base}`) || fp === base;
  });
}

/**
 * Check if LLM-generated content contains real export names from the source.
 * If the content doesn't mention any real exports, the LLM hallucinated.
 */
/** Sanitize mermaid code blocks: strip lines with common LLM syntax errors. */
export function sanitizeMermaidBlocks(content: string): string {
  return content.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_match, body: string) => {
      const lines: string[] = body.split('\n');
      const cleaned = lines.filter(line => {
        const trimmed = line.trim();
        // Reject lines with template literals (${...})
        if (/\$\{/.test(trimmed)) return false;
        // Reject double braces used incorrectly: -->{{...}} or {{"..."}}
        if (/\{\{.*\}\}/.test(trimmed) && !/\{\{.*\}\}/.test(trimmed.replace(/\w+\{\{".+?"\}\}/, ''))) {
          // Only strip truly broken double-brace patterns; keep valid Mermaid rhombus {{}}
          if (/-->\s*\{\{/.test(trimmed) || /\{\{".*"\}\}/.test(trimmed)) return false;
        }
        // Reject lines with unbalanced quotes inside node labels
        if (/\["[^"]*$/.test(trimmed) || /^[^"]*"\]/.test(trimmed)) return false;
        return true;
      });
      return '```mermaid\n' + cleaned.join('\n') + '```';
    }
  );
}

export function llmContentMatchesRealExports(
  llmContent: string,
  scan: ScanResult,
  sourceFiles: string[]
): boolean {
  const realNames: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;
    const { body } = scriptOrSelfForAnalysis(sf, scanned.content);
    for (const line of body.split('\n')) {
      const m = line.match(/^export\s+(?:async\s+)?(?:function|class|const|type|interface|enum)\s+(\w+)/);
      if (m) realNames.push(m[1]);
    }
    if (/\.php$/i.test(sf)) {
      for (const line of extractPhpSymbolLines(scanned.content)) {
        const c = line.match(/(?:^|\s)(?:class|interface|trait|enum)\s+(\w+)/i);
        if (c) realNames.push(c[1]);
        const fn = line.match(/function\s+(\w+)\s*\(/i);
        if (fn) realNames.push(fn[1]);
      }
    }
    if (/\.py$/i.test(sf)) {
      for (const line of extractPythonSymbolLines(scanned.content)) {
        const defm = line.match(/def\s+(\w+)\s*\(/);
        if (defm) realNames.push(defm[1]);
        const clm = line.match(/class\s+(\w+)/);
        if (clm) realNames.push(clm[1]);
      }
    }
    if (/\.go$/i.test(sf)) {
      for (const line of extractGoSymbolLines(scanned.content)) {
        if (!line.startsWith('func ')) continue;
        const m = line.match(/^func(?:\s+\([^)]+\))?\s+(\w+)\s*\(/);
        if (m) realNames.push(m[1]);
        const ty = line.match(/^type\s+(\w+)\s+/);
        if (ty) realNames.push(ty[1]);
      }
    }
    if (/\.cs$/i.test(sf)) {
      for (const line of extractCSharpSymbolLines(scanned.content)) {
        const cls = line.match(/(?:class|interface|record|struct|enum)\s+(\w+)/i);
        if (cls) realNames.push(cls[1]);
      }
    }
    if (/\.rs$/i.test(sf)) {
      for (const line of extractRustSymbolLines(scanned.content)) {
        const fn = line.match(/^fn\s+(\w+)/);
        if (fn) realNames.push(fn[1]);
        const ty = line.match(/^(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/);
        if (ty) realNames.push(ty[1]);
      }
    }
    if (/\.(java|kt)$/i.test(sf)) {
      for (const line of extractJavaKotlinSymbolLines(scanned.content)) {
        const cls = line.match(/(?:class|interface|record|enum)\s+(\w+)/i);
        if (cls) realNames.push(cls[1]);
      }
    }
    if (/\.rb$/i.test(sf)) {
      for (const line of extractRubySymbolLines(scanned.content)) {
        const cls = line.match(/^(?:class|module)\s+(\w+)/);
        if (cls) realNames.push(cls[1]);
        const defm = line.match(/^def\s+(?:self\.)?(\w+)/);
        if (defm) realNames.push(defm[1]);
      }
    }
    if (/\.vue$/i.test(sf)) {
      const { body } = scriptOrSelfForAnalysis(sf, scanned.content);
      for (const k of extractVuePropKeys(body)) realNames.push(k);
      for (const m of body.matchAll(/const\s+(\w+)\s*=\s*computed\s*\(/g)) realNames.push(m[1]);
    }
  }
  if (realNames.length === 0) return true; // no exports → can't validate
  const hits = realNames.filter(name => llmContent.includes(name)).length;
  return hits / realNames.length >= 0.3; // at least 30% of real exports mentioned
}

/** Second-chance prompt when local models skip <<<EOF>>> or add prose. */
export function buildSubsystemRepairMessage(today: string, instructionPath: string, planItem?: BuildPlanItem): string {
  const NON_SRC_PAT = /^(tsconfig|\.env|\.copilotignore|\.graph-context-ignore|\.context-graph-ignore|\.eslint|\.prettier|jest\.config|vitest\.config|webpack|rollup|babel|\.editorconfig|\.gitignore)/i;
  const rawApply = planItem?.applyTo ?? 'src/**';
  const applyTo = rawApply.split(',').map(s => s.trim()).filter(s => !NON_SRC_PAT.test(path.posix.basename(s))).join(',') || rawApply;
  const desc = (planItem?.description ?? 'subsystem').replace(/"/g, '\\"');
  return [
    OUTPUT_FORMAT_INSTRUCTION,
    `Reply with EXACTLY ONE file. No text before the first line or after the last line.`,
    `Line 1 MUST be exactly: <<<FILE: ${instructionPath}>>>`,
    `Last line MUST be exactly: <<<EOF>>>`,
    ``,
    `Inside the block use YAML frontmatter then markdown, e.g.:`,
    `---`,
    `description: "${desc}"`,
    `applyTo: "${applyTo}"`,
    `priority: "${planItem?.priority ?? 'P1'}"`,
    `last_updated: "${today}"`,
    `---`,
    ``,
    `## When to Read`,
    `- (3–6 short bullets)`,
    `## Graph`,
    '```mermaid',
    `graph LR; E[exports] --> D[deps]`,
    '```',
    `## Signatures`,
    `## Contracts`,
    `## Error Handling`,
    `## Danger Zone 🔴`,
    ``,
    `Keep the whole file under ~90 lines.`,
  ].join('\n');
}
