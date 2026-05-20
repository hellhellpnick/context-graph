import path from 'path';
import type { ScanResult } from '../../scanner';
import type { BuildPlanItem } from '../types';
import type { OutputFile } from '../../writer';
import {
  extractExports,
  buildDeterministicSourceSection,
  shouldIncludeDeterministicSource,
  buildVueMermaidNodes,
} from '../extract/exports';
import { isMessageOrPromptPath } from '../../source-extract';
import { extractImports } from '../extract/imports';
import {
  extractCliCommands,
  extractFilePurpose,
  extractReExportTargets,
  isWeakFilePurpose,
} from '../extract/misc';
import { isBarrelFile } from '../extract/imports';
import {
  extractCSharpSymbolLines,
  extractGoSymbolLines,
  extractJavaKotlinSymbolLines,
  extractPhpSymbolLines,
  extractPythonSymbolLines,
  extractRubySymbolLines,
  extractRustSymbolLines,
  extractVueSymbolLines,
  scriptOrSelfForAnalysis,
} from '../../source-extract';
import {
  extractDeterministicErrorsForFile,
  extractRuntimeSection,
  extractSideEffectsForFile,
} from '../../framework-extract';

export function buildDeterministicSubsystemFile(
  today: string,
  instructionPath: string,
  planItem: BuildPlanItem | undefined,
  scan: ScanResult,
  sourceFiles: string[]
): OutputFile {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const desc = esc(planItem?.description ?? `Documentation for ${sourceFiles.map(f => path.posix.basename(f)).join(', ')}`);

  // ── applyTo: only real source files the instruction targets, no configs ──
  const NON_SOURCE_PATTERNS = /^(tsconfig|\.env|\.copilotignore|\.graph-context-ignore|\.context-graph-ignore|\.eslint|\.prettier|jest\.config|vitest\.config|webpack|rollup|babel|\.editorconfig|\.gitignore)/i;
  const rawApplyTo = planItem?.applyTo ?? (sourceFiles.length === 1 ? sourceFiles[0] : 'src/**');
  const cleanedApplyTo = rawApplyTo
    .split(',')
    .map(s => s.trim())
    .filter(s => !NON_SOURCE_PATTERNS.test(path.posix.basename(s)))
    .join(',');
  const applyTo = esc(cleanedApplyTo || rawApplyTo);
  const prio = planItem?.priority ?? 'P1';

  // ── Barrel / re-export detection ──
  let isBarrel = false;
  if (sourceFiles.length === 1) {
    const scanned = scan.files.find(f => f.path === sourceFiles[0]);
    if (scanned?.content) isBarrel = isBarrelFile(scanned.content);
  }

  // ── CLI command detection ──
  const cliCommands: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (scanned?.content) cliCommands.push(...extractCliCommands(scanned.content));
  }

  // When to Read — real use cases
  const useCases =
    planItem?.useCases?.filter(u => !u.includes('navigating this subsystem')).slice(0, 6) ?? [];
  if (useCases.length === 0) {
    for (const f of sourceFiles) useCases.push(`editing or refactoring \`${path.posix.basename(f)}\``);
  }

  // File purpose summaries — JSDoc first, then plan description as fallback
  const fileSummaries: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;
    const rawPurpose = extractFilePurpose(scanned.content);
    const purpose =
      rawPurpose && !isWeakFilePurpose(rawPurpose)
        ? rawPurpose
        : planItem?.description && !isWeakFilePurpose(planItem.description)
          ? planItem.description
          : null;
    const lineCount = scanned.lines;
    const exportCount = (() => {
      if (/\.php$/i.test(sf)) return extractPhpSymbolLines(scanned.content).length;
      if (/\.py$/i.test(sf)) return extractPythonSymbolLines(scanned.content).length;
      if (/\.go$/i.test(sf)) return extractGoSymbolLines(scanned.content).length;
      if (/\.cs$/i.test(sf)) return extractCSharpSymbolLines(scanned.content).length;
      if (/\.rs$/i.test(sf)) return extractRustSymbolLines(scanned.content).length;
      if (/\.(java|kt)$/i.test(sf)) return extractJavaKotlinSymbolLines(scanned.content).length;
      if (/\.rb$/i.test(sf)) return extractRubySymbolLines(scanned.content).length;
      const { body } = scriptOrSelfForAnalysis(sf, scanned.content);
      if (/\.vue$/i.test(sf)) {
        const vueSyms = extractVueSymbolLines(body).length;
        if (vueSyms > 0) return vueSyms;
      }
      const exp = body.split('\n').filter(l => /^export\s/.test(l.trim())).length;
      if (exp > 0) return exp;
      return body.split('\n').filter(l => /^(?:export\s+)?(?:async\s+)?function\s+\w+/.test(l.trim())).length;
    })();
    const suffix = exportCount > 0 ? ` · ${exportCount} top-level symbols` : '';
    const roleHint = isMessageOrPromptPath(sf)
      ? ' — **LLM prompt builder** (routing only; edit templates in repo)'
      : '';
    fileSummaries.push(
      purpose
        ? `- \`${sf}\` (${lineCount} lines${suffix}) — ${purpose}${roleHint}`
        : `- \`${sf}\` (${lineCount} lines${suffix})${roleHint}`
    );
  }

  // Exports with JSDoc (or barrel summary)
  let exportBlock: string;
  if (isBarrel) {
    const scanned = scan.files.find(f => f.path === sourceFiles[0]);
    const reExports = (scanned?.content ?? '').split('\n').filter(l => /^export\s/.test(l.trim()));
    exportBlock = `// Barrel file — re-exports only:\n${reExports.join('\n') || '// (empty barrel)'}`;
  } else if (cliCommands.length > 0) {
    const exportSigs = extractExports(scan, sourceFiles);
    const cmds = cliCommands.map(c => `//   ${c}`).join('\n');
    exportBlock = exportSigs
      ? `${exportSigs}\n\n// CLI commands:\n${cmds}`
      : `// CLI entry point — commands:\n${cmds}`;
  } else {
    exportBlock = extractExports(scan, sourceFiles);
  }

  // Dependencies
  const deps = extractImports(scan, sourceFiles);
  const nuxtDeps = deps.filter(d => d.startsWith('#'));
  const nextDeps = deps.filter(d => d === 'next' || d.startsWith('next/'));
  const angularDeps = deps.filter(d => d.startsWith('@angular/'));
  const internalDeps = deps.filter(d => {
    if (nuxtDeps.includes(d) || nextDeps.includes(d) || angularDeps.includes(d)) return false;
    if (d.includes('node_modules')) return false;
    if (d.startsWith('@') && !d.startsWith('@/')) return false;
    if (!d.includes('/')) return false;
    const first = d.split('/')[0]!;
    if (first.includes('.') && !first.startsWith('.')) return false;
    return true;
  });
  const externalDeps = deps.filter(
    d =>
      !internalDeps.includes(d) &&
      !nuxtDeps.includes(d) &&
      !nextDeps.includes(d) &&
      !angularDeps.includes(d)
  );

  const errorLines: string[] = [];
  const sideEffectLines: string[] = [];
  let runtimeSectionTitle = 'Runtime';
  const runtimeLines: string[] = [];
  for (const sf of sourceFiles) {
    const scanned = scan.files.find(f => f.path === sf);
    if (!scanned?.content) continue;
    const base = path.posix.basename(sf);
    errorLines.push(...extractDeterministicErrorsForFile(sf, scanned.content, base));
    for (const line of extractSideEffectsForFile(sf, scanned.content)) {
      if (!sideEffectLines.includes(line)) sideEffectLines.push(line);
    }
    const rt = extractRuntimeSection(sf, scanned.content);
    if (rt.bullets.length > 0) runtimeSectionTitle = rt.title;
    for (const line of rt.bullets) {
      if (!runtimeLines.includes(line)) runtimeLines.push(line);
    }
  }

  // Mermaid graph — Vue internals + module dependencies
  const mermaidNodes: string[] = [];
  const vueNodeIds = new Set<string>();
  const hasVue = sourceFiles.some(p => /\.vue$/i.test(p));
  const fileLabel = sourceFiles.length === 1
    ? path.posix.basename(sourceFiles[0]).replace(/\.[^.]+$/, '')
    : planItem?.area ?? 'module';

  if (hasVue) {
    for (const sf of sourceFiles) {
      if (!/\.vue$/i.test(sf)) continue;
      const scanned = scan.files.find(f => f.path === sf);
      if (!scanned?.content) continue;
      mermaidNodes.push(...buildVueMermaidNodes(sf, scanned.content, vueNodeIds));
    }
  }

  const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, '_') || 'node';

  if (isBarrel && sourceFiles.length === 1) {
    const scanned = scan.files.find(f => f.path === sourceFiles[0]);
    const targets = scanned?.content ? extractReExportTargets(scanned.content) : [];
    const hubId = safeId(fileLabel);
    mermaidNodes.push(`  ${hubId}["${fileLabel} (re-export)"]`);
    for (const t of targets.slice(0, 6)) {
      const label = t.replace(/^\.\//, '');
      const tid = safeId(label);
      if (tid === hubId) continue;
      mermaidNodes.push(`  ${hubId} --> ${tid}["${label}"]`);
    }
  } else if (internalDeps.length > 0 || externalDeps.length > 0) {
    const hub = hasVue && sourceFiles.length > 1 ? safeId(fileLabel) : safeId(fileLabel);
    if (!hasVue || sourceFiles.length > 1) {
      mermaidNodes.push(`  ${hub}[${fileLabel}]`);
    }
    for (const d of internalDeps.slice(0, 8)) {
      const depName = d.split('/').pop()!;
      const depId = safeId(depName);
      if (depId === hub) continue;
      mermaidNodes.push(`  ${hub} --> ${depId}[${depName}]`);
    }
    for (const d of externalDeps.slice(0, 5)) {
      const safeName = safeId(d);
      if (safeName === hub) continue;
      mermaidNodes.push(`  ${hub} --> ${safeName}["${d}"]`);
    }
    if (sideEffectLines.some(l => l.includes('[env]'))) {
      mermaidNodes.push(`  ${hub} --> ENV{{"env / config"}}`);
    }
  }

  const mermaidFiltered = mermaidNodes.filter(line => {
    const m = line.match(/^\s*(\w+)\s*-->\s*(\w+)/);
    return !(m && m[1] === m[2]);
  });

  const includeSource = shouldIncludeDeterministicSource(scan, sourceFiles, exportBlock);
  const sourceSection = includeSource ? buildDeterministicSourceSection(scan, sourceFiles) : [];

  const DEP_LIST_CAP = 12;
  const capDepList = (list: string[]) => {
    if (list.length <= DEP_LIST_CAP) return list;
    const rest = list.length - DEP_LIST_CAP;
    return [...list.slice(0, DEP_LIST_CAP), `… +${rest} more (open repo for full list)`];
  };

  const hasPhp = sourceFiles.some(p => /\.php$/i.test(p));
  const allPhp = hasPhp && sourceFiles.every(p => /\.php$/i.test(p));
  const allPy = sourceFiles.every(p => /\.py$/i.test(p));
  const allGo = sourceFiles.every(p => /\.go$/i.test(p));
  const allCs = sourceFiles.every(p => /\.cs$/i.test(p));
  const allRs = sourceFiles.every(p => /\.rs$/i.test(p));
  const allJava = sourceFiles.every(p => /\.java$/i.test(p));
  const allKt = sourceFiles.every(p => /\.kt$/i.test(p));
  const allRb = sourceFiles.every(p => /\.rb$/i.test(p));
  const hasJsx = sourceFiles.some(p => /\.(tsx|jsx)$/i.test(p));
  const sigFence = allPhp
    ? 'php'
    : allPy
      ? 'python'
      : allGo
        ? 'go'
        : allCs
          ? 'csharp'
          : allRs
            ? 'rust'
            : allJava
              ? 'java'
              : allKt
                ? 'kotlin'
                : allRb
                  ? 'ruby'
                  : hasVue || hasJsx
                    ? 'javascript'
                    : 'typescript';

  const content = [
    '---',
    `description: "${desc}"`,
    `applyTo: "${applyTo}"`,
    `priority: "${prio}"`,
    `last_updated: "${today}"`,
    '---',
    '',
    '## When to Read',
    ...useCases.map(u => `- ${u}`),
    '',
    '## Overview',
    ...(fileSummaries.length > 0 ? fileSummaries : [`- ${sourceFiles.join(', ')}`]),
    '',
    '## Graph',
    '```mermaid',
    'graph LR',
    ...(mermaidFiltered.length > 0 ? mermaidFiltered : [`  ${safeId(fileLabel)}[${fileLabel}]`]),
    '```',
    '',
    '## Signatures',
    '',
    `\`\`\`${sigFence}`,
    exportBlock,
    '```',
    '',
    ...(sourceSection.length > 0
      ? ['## Source', '', ...sourceSection]
      : []),
    ...(runtimeLines.length > 0
      ? [`## ${runtimeSectionTitle}`, ...runtimeLines.map(l => `- ${l}`), '']
      : []),
    '## Dependencies',
    ...(internalDeps.length > 0
      ? ['**Internal:**', ...capDepList(internalDeps).map(d => `- \`${d}\``), '']
      : []),
    ...(nuxtDeps.length > 0 ? ['**Nuxt:**', ...capDepList(nuxtDeps).map(d => `- \`${d}\``), ''] : []),
    ...(nextDeps.length > 0 ? ['**Next.js:**', ...capDepList(nextDeps).map(d => `- \`${d}\``), ''] : []),
    ...(angularDeps.length > 0
      ? ['**Angular:**', ...capDepList(angularDeps).map(d => `- \`${d}\``), '']
      : []),
    ...(externalDeps.length > 0
      ? [
          allPhp && externalDeps.length > DEP_LIST_CAP
            ? `**External:** (${externalDeps.length} imports — graph shows top edges)`
            : '**External:**',
          ...capDepList(externalDeps).map(d => `- \`${d}\``),
          '',
        ]
      : []),
    ...(internalDeps.length === 0 &&
    externalDeps.length === 0 &&
    nuxtDeps.length === 0 &&
    nextDeps.length === 0 &&
    angularDeps.length === 0
      ? ['- No dependencies detected', '']
      : []),
    ...(!isBarrel && errorLines.length > 0
      ? ['## Error Handling', ...errorLines, '']
      : []),
    ...(sideEffectLines.length > 0 ? ['## Danger Zone 🔴', ...sideEffectLines, ''] : []),
  ].join('\n');
  return { path: instructionPath, content };
}
