import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRootSlimMode,
  buildQuickNavigationLines,
  buildSlimArchitectureOverviewLines,
  sourceDirGroupKey,
} from '../dist/graph-builder/deterministic/root-slim.js';
import { buildDeterministicCopilotInstructions } from '../dist/graph-builder/deterministic/root.js';

function fakePlan(n) {
  const subsystems = Array.from({ length: n }, (_, i) => ({
    file: `app/Controllers/C${i}.instructions.md`,
    area: `Controller${i}`,
    priority: i < 3 ? 'P0' : i < 20 ? 'P1' : 'P2',
    sourceFiles: [`app/Http/Controllers/C${i}.php`],
    applyTo: `app/Http/Controllers/C${i}.php`,
    useCases: [`editing C${i}.php`],
    description: `Mirror — C${i}.php`,
  }));
  return {
    projectName: 'Big',
    projectDescription: 'Test app',
    techStack: ['PHP'],
    subsystems,
  };
}

describe('resolveRootSlimMode', () => {
  it('auto-enables at 40+ subsystems', () => {
    assert.equal(resolveRootSlimMode(fakePlan(39)), false);
    assert.equal(resolveRootSlimMode(fakePlan(40)), true);
  });

  it('auto-enables at 80+ source files', () => {
    const plan = fakePlan(10);
    plan.subsystems = Array.from({ length: 10 }, (_, i) => ({
      ...plan.subsystems[0],
      file: `batch${i}.instructions.md`,
      area: `Batch${i}`,
      sourceFiles: Array.from({ length: 8 }, (_, j) => `app/F${i}_${j}.php`),
    }));
    assert.equal(resolveRootSlimMode(plan), true);
  });

  it('respects explicit slimRoot', () => {
    assert.equal(resolveRootSlimMode(fakePlan(5), { slimRoot: true }), true);
    assert.equal(resolveRootSlimMode(fakePlan(200), { slimRoot: false }), false);
  });

  it('auto slim when rootOpts omitted (not forced false)', () => {
    assert.equal(resolveRootSlimMode(fakePlan(100)), true);
  });
});

describe('sourceDirGroupKey', () => {
  it('groups Laravel controllers under app/Http/Controllers', () => {
    assert.equal(
      sourceDirGroupKey('app/Http/Controllers/API/Foo.php'),
      'app/Http/Controllers'
    );
  });
});

describe('buildQuickNavigationLines (slim)', () => {
  it('caps entries and points to path-index', () => {
    const lines = buildQuickNavigationLines(fakePlan(120), true, { files: [], tree: '', tokenEstimate: 0, fileCount: 0, skippedCount: 0 });
    const joined = lines.join('\n');
    assert.match(joined, /path-index/);
    assert.match(joined, /Slim root \(120 subsystems\)/);
    assert.ok(lines.length < 80);
  });
});

describe('buildDeterministicCopilotInstructions', () => {
  it('slim root stays under ~250 lines for 200 subsystems', () => {
    const plan = fakePlan(200);
    const md = buildDeterministicCopilotInstructions('2026-05-18', { files: [] }, plan);
    const lineCount = md.split('\n').length;
    assert.ok(lineCount < 250, `expected <250 lines, got ${lineCount}`);
    assert.match(md, /slim root/i);
    assert.doesNotMatch(md, /Controller199.*Controller198/s);
  });

  it('forced slimRoot:false expands architecture (fat root)', () => {
    const plan = fakePlan(80);
    const md = buildDeterministicCopilotInstructions('2026-05-18', { files: [] }, plan, {
      slimRoot: false,
    });
    assert.ok(md.split('\n').length > 300, 'fat root when slim explicitly disabled');
    assert.doesNotMatch(md, /slim root/i);
  });
});
