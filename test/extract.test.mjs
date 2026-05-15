import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {
  compactTsExportLine,
  isPromptTemplateBody,
  isExecutableModulePath,
} from '../dist/source-extract.js';
import {
  extractFilePurpose,
  isWeakFilePurpose,
  extractReExportTargets,
} from '../dist/graph-builder/extract/misc.js';
import { inferFilePriority } from '../dist/graph-builder/plan/priority.js';

describe('extractFilePurpose', () => {
  it('skips indented Commander hint inside function', () => {
    const content = `export function extractCliCommands(content: string): string[] {
    // Commander: .command('build [dir]')
    return [];
}`;
    assert.equal(extractFilePurpose(content), null);
  });

  it('ignores JSDoc on first exported function (uses header only)', () => {
    const content = `export function extractCliCommands() {}
/** Targets barrels only — not file purpose. */
export function extractReExportTargets() {}`;
    assert.equal(extractFilePurpose(content), null);
  });

  it('reads file-level block comment', () => {
    const content = `/**
 * Framework-aware deterministic extraction (no LLM).
 */
export function foo() {}`;
    assert.match(extractFilePurpose(content) ?? '', /Framework-aware/);
  });
});

describe('isWeakFilePurpose', () => {
  it('rejects .command hints', () => {
    assert.equal(isWeakFilePurpose("Commander: .command('build')"), true);
  });
});

describe('extractReExportTargets', () => {
  it('parses export * from', () => {
    const t = extractReExportTargets(`export * from './graph-builder/index';\n`);
    assert.deepEqual(t, ['./graph-builder/index']);
  });
});

describe('compactTsExportLine / isPromptTemplateBody', () => {
  it('CLI path collapses as executable not prompt template', () => {
    const path = 'src/cli/commands/build.ts';
    assert.equal(isExecutableModulePath(path), true);
    const body = `export function registerBuildCommand(program: Command): void {
      program.command('build').option('--hybrid');
      fs.writeFileSync(configPath, '{}');
    }`;
    assert.equal(isPromptTemplateBody(body, path), false);
  });

  it('planning message file stays prompt template', () => {
    const chunks = Array.from({ length: 16 }, (_, i) => `\`line ${i}\``);
    const body = `return [${chunks.join(', ')}, '<<<FILE: path>>>'].join("\\n");`;
    assert.equal(isPromptTemplateBody(body, 'src/graph-builder/messages/planning.ts'), true);
  });

  it('registerBuildCommand signature uses ~lines not prompt template', () => {
    const src = `export function registerBuildCommand(program: Command): void {
${'  console.log("x");\n'.repeat(40)}}`;
    const sf = ts.createSourceFile('build.ts', src, ts.ScriptTarget.Latest, true);
    const fn = sf.statements.find(ts.isFunctionDeclaration);
    const line = compactTsExportLine(sf, fn, 'src/cli/commands/build.ts');
    assert.match(line, /~\d+ lines/);
    assert.doesNotMatch(line, /prompt template/);
  });
});

describe('inferFilePriority project-root', () => {
  it('project-root.ts is P1', () => {
    assert.equal(inferFilePriority('src/project-root.ts'), 'P1');
  });
});
