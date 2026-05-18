import { isComposableLikePath, isMessageOrPromptPath } from './paths';
import { extractScriptSkeleton } from './ts-skeleton';
import { extractVuePropKeys, scriptOrSelfForAnalysis } from './vue-sfc';

/** Score for auto split: one instruction file per “heavy” module (no LLM). */
export function instructionSplitScore(relPath: string, content: string, lines?: number): number {
  const norm = relPath.replace(/\\/g, '/');
  let score = 0;

  if (isComposableLikePath(norm)) return 100;

  const lineCount = lines ?? content.split('\n').length;

  if (isMessageOrPromptPath(norm)) return 12;
  const inUiTree = /(?:^|\/)(components|pages|layouts|views|widgets|stores|middleware|plugins)\//i.test(
    norm
  );
  if (inUiTree && (!/\.vue$/i.test(norm) || lineCount > 38)) score += 16;
  if (/\.vue$/i.test(norm)) score += 20;
  if (/(?:^|\/)pages\//i.test(norm) && /\.vue$/i.test(norm)) score += 30;
  if (lineCount > 55) score += 12;
  if (lineCount > 95) score += 14;

  const { body, virtualPath } = scriptOrSelfForAnalysis(norm, content);
  if (!body.trim()) return score;

  const skeleton = extractScriptSkeleton(body, virtualPath);
  score += Math.min(24, skeleton.length * 5);

  if (/\.vue$/i.test(norm) || /\.(vue|ts|js)$/i.test(norm)) {
    if (extractVuePropKeys(body).length >= 4) score += 10;
    const computeds = [...body.matchAll(/const\s+\w+\s*=\s*computed\s*\(/g)].length;
    if (computeds >= 2) score += 14;
    if (computeds >= 1 && /switch\s*\(/.test(body)) score += 12;
    if (/\buseAsyncPageData\s*\(|\buseFetch\s*\(|\buseAsyncData\s*\(/.test(body)) score += 16;
    if (/\bthrow\s+createError\s*\(/.test(body)) score += 12;
    if (/\buseNuxtApp\s*\(/.test(body)) score += 10;
    if (/\buse\w+Store\s*\(/.test(body)) score += 8;
    if (/\$(event|listen|offEvent)\s*\(/.test(body)) score += 8;
    if (/\bwindow\.(addEventListener|removeEventListener)/.test(body)) score += 6;
  }

  return score;
}

export const INSTRUCTION_OWN_FILE_SCORE_THRESHOLD = 42;
