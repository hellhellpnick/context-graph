import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  auditRoutingEntrypoints,
  collectExpectedRoutingEntrypoints,
  routingContentHasMandate,
} from '../dist/graph-builder/deterministic/routing-entrypoints.js';
import { buildAgentEntryWithTool } from '../dist/graph-builder/deterministic/routing-mandate.js';
import { injectDeterministicRootFiles } from '../dist/graph-builder/deterministic/root.js';

describe('routing-entrypoints', () => {
  it('collectExpectedRoutingEntrypoints always includes AGENTS.md and copilot hub', () => {
    const paths = collectExpectedRoutingEntrypoints(['copilot']);
    assert.ok(paths.includes('AGENTS.md'));
    assert.ok(paths.includes('.github/instructions/copilot-instructions.md'));
    assert.ok(!paths.includes('.cursor/rules/context-graph.mdc'));
  });

  it('routingContentHasMandate accepts generated agent entry', () => {
    const md = buildAgentEntryWithTool('Test', 'agents').join('\n');
    assert.equal(routingContentHasMandate(md), true);
  });

  it('auditRoutingEntrypoints reports missing cursor rule', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-route-'));
    const agents = buildAgentEntryWithTool('Agent Instructions', 'agents').join('\n');
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), agents);
    fs.mkdirSync(path.join(dir, '.github/instructions'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.github/instructions/copilot-instructions.md'), agents);

    const issues = auditRoutingEntrypoints(dir, ['cursor', 'copilot']);
    assert.ok(issues.some(i => i.relPath === '.cursor/rules/context-graph.mdc' && i.kind === 'missing'));

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('injectDeterministicRootFiles emits separate windsurf, cline, and codex paths', () => {
    const files = [];
    const plan = {
      projectName: 't',
      projectDescription: 't',
      techStack: [],
      subsystems: [],
    };
    injectDeterministicRootFiles('2026-01-01', { files: [], tree: '', tokenEstimate: 0, fileCount: 0, skippedCount: 0 }, plan, files, undefined, undefined, [
      'windsurf',
      'cline',
      'codex',
    ]);
    const paths = files.map(f => f.path);
    assert.ok(paths.includes('.windsurf/rules/context-graph.md'));
    assert.ok(paths.includes('.clinerules/context-graph.md'));
    assert.ok(paths.includes('.codex/context-graph.md'));
  });
});
