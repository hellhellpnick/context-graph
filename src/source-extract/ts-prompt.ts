import ts from 'typescript';
import { isExecutableModulePath } from './paths';
import { truncateSkeleton } from './utils';

function isExecutableImplementationBody(text: string, filePath?: string): boolean {
  if (filePath && isExecutableModulePath(filePath)) return true;
  if (/register\w+Command\s*\(/.test(text) && /\.command\s*\(/.test(text)) return true;
  if (
    /\.command\s*\(/.test(text) &&
    /(writeFileSync|readFileSync|process\.exit|installPrePushHook|scanProject|buildGraph)/.test(text)
  ) {
    return true;
  }
  return false;
}

/** Large string templates embedded in TS (LLM pass messages, not runtime logic). */
export function isPromptTemplateBody(text: string, filePath?: string): boolean {
  if (isExecutableImplementationBody(text, filePath)) return false;
  const t = text.replace(/\s+/g, ' ');
  let signals = 0;
  if (/Run MODE:|<<<FILE:|OUTPUT_FORMAT|ANTI-HALLUCINATION|MANDATORY SECTIONS|buildNotesPrompt|buildSubsystemPassMessage/i.test(t)) {
    signals += 2;
  }
  if (/\]\s*\.join\s*\(\s*['"]\\n['"]\s*\)/.test(t)) signals++;
  if ((t.match(/`/g)?.length ?? 0) >= 14 && t.length > 500) signals++;
  return signals >= 2 || (signals >= 1 && t.length > 700);
}

/** One-line export for instruction graphs (collapse prompt bodies). */
export function compactTsExportLine(sf: ts.SourceFile, node: ts.Node, filePath?: string): string {
  const raw = node.getText(sf);
  const lineCount = raw.split('\n').length;
  const collapse = (label: string) => {
    const head = raw.split('{')[0]?.replace(/\s+/g, ' ').trim() ?? raw;
    const sig = head.length > 200 ? `${head.slice(0, 197)}…` : head;
    return `${sig} { ${label} }`;
  };

  if (!isPromptTemplateBody(raw, filePath)) {
    if (lineCount > 28 || raw.length > 520) {
      return collapse(`/* ~${lineCount} lines */`);
    }
    const t = raw.replace(/\s+/g, ' ').trim();
    return t.length > 240 ? `${t.slice(0, 237)}…` : t;
  }
  return collapse(`/* prompt template (~${lineCount} lines) */`);
}
