import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  normalizeInstructionTargets,
  parseInstructionTargetsEnv,
  parseInstallAgentsEnv,
  hasConfiguredInstructionTargets,
  hasConfiguredInstallAgents,
  needsInstructionTargetSetup,
  needsInstallAgentsSetup,
  needsDeterministicPreferencesSetup,
  persistDeterministicPreferences,
  resolveInstallAgents,
  isInstructionTargetEnabled,
} from '../dist/instruction-targets.js';
import { loadConfig, readConfigFile } from '../dist/config.js';
import { projectGraphExists } from '../dist/project-graph.js';

describe('normalizeInstructionTargets', () => {
  it('parses all and lists', () => {
    assert.deepEqual(normalizeInstructionTargets('all'), [
      'copilot',
      'cursor',
      'claude',
      'agents',
      'gemini',
      'windsurf',
      'codex',
      'cline',
    ]);
    assert.deepEqual(normalizeInstructionTargets(['copilot', 'cursor']), ['copilot', 'cursor']);
  });

  it('rejects empty', () => {
    assert.equal(normalizeInstructionTargets([]), null);
    assert.equal(normalizeInstructionTargets(['nope']), null);
  });
});

describe('parseInstructionTargetsEnv', () => {
  it('splits comma list', () => {
    assert.deepEqual(parseInstructionTargetsEnv('copilot,cursor'), ['copilot', 'cursor']);
  });
});

describe('parseInstallAgentsEnv', () => {
  it('parses booleans', () => {
    assert.equal(parseInstallAgentsEnv('true'), true);
    assert.equal(parseInstallAgentsEnv('0'), false);
    assert.equal(parseInstallAgentsEnv('maybe'), null);
  });
});

describe('config integration', () => {
  it('loadConfig reads instructionTargets from file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-targets-'));
    fs.writeFileSync(
      path.join(dir, '.context-graph.json'),
      JSON.stringify({ instructionTargets: ['copilot', 'claude'] }, null, 2)
    );
    const cfg = loadConfig(dir);
    assert.deepEqual(cfg.instructionTargets, ['copilot', 'claude']);
    assert.equal(cfg.installAgents, false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('loadConfig reads installAgents from file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-agents-'));
    fs.writeFileSync(
      path.join(dir, '.context-graph.json'),
      JSON.stringify({ installAgents: true }, null, 2)
    );
    assert.equal(loadConfig(dir).installAgents, true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('persistDeterministicPreferences merges buildStrategy and agents', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-targets-'));
    fs.writeFileSync(
      path.join(dir, '.context-graph.json'),
      JSON.stringify({ provider: 'ollama' }, null, 2)
    );
    persistDeterministicPreferences(dir, {
      instructionTargets: ['cursor'],
      installAgents: true,
    });
    const raw = readConfigFile(dir);
    assert.equal(raw.provider, 'ollama');
    assert.equal(raw.buildStrategy, 'deterministic');
    assert.deepEqual(raw.instructionTargets, ['cursor']);
    assert.equal(raw.installAgents, true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('hasConfiguredInstructionTargets', () => {
    assert.equal(hasConfiguredInstructionTargets({}), false);
    assert.equal(hasConfiguredInstructionTargets({ instructionTargets: ['copilot'] }), true);
  });

  it('hasConfiguredInstallAgents', () => {
    assert.equal(hasConfiguredInstallAgents({}), false);
    assert.equal(hasConfiguredInstallAgents({ installAgents: false }), true);
  });

  it('needsInstructionTargetSetup', () => {
    assert.equal(needsInstructionTargetSetup({}), true);
    assert.equal(needsInstructionTargetSetup({ instructionTargets: ['copilot'] }), false);
  });

  it('needsInstallAgentsSetup', () => {
    assert.equal(needsInstallAgentsSetup({}), true);
    assert.equal(needsInstallAgentsSetup({ installAgents: false }), false);
  });

  it('needsDeterministicPreferencesSetup', () => {
    assert.equal(needsDeterministicPreferencesSetup({ instructionTargets: ['copilot'] }), true);
    assert.equal(
      needsDeterministicPreferencesSetup({
        instructionTargets: ['copilot'],
        installAgents: false,
      }),
      false
    );
  });

  it('resolveInstallAgents', () => {
    assert.equal(resolveInstallAgents({ installAgents: true }), true);
    assert.equal(resolveInstallAgents({}), false);
  });
});

describe('projectGraphExists', () => {
  it('false without markers', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-graph-'));
    assert.equal(projectGraphExists(dir), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('true when copilot-instructions present', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-graph-'));
    const inst = path.join(dir, '.github/instructions');
    fs.mkdirSync(inst, { recursive: true });
    fs.writeFileSync(path.join(inst, 'copilot-instructions.md'), '# graph\n');
    assert.equal(projectGraphExists(dir), true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('isInstructionTargetEnabled', () => {
  it('checks membership', () => {
    assert.equal(isInstructionTargetEnabled(['copilot'], 'copilot'), true);
    assert.equal(isInstructionTargetEnabled(['copilot'], 'cursor'), false);
  });
});
