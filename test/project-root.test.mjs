import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  normalizeBuildDirArg,
  assertProjectRootExists,
  suggestedBuildFlagForMistake,
} from '../dist/project-root.js';

describe('normalizeBuildDirArg', () => {
  it('hybrid → repo root + mistakenModeFlag', () => {
    const n = normalizeBuildDirArg('hybrid');
    assert.equal(n.projectDir, undefined);
    assert.equal(n.mistakenModeFlag, 'hybrid');
    assert.equal(suggestedBuildFlagForMistake('hybrid'), '--hybrid');
  });

  it('no-llm → deterministic flag hint', () => {
    const n = normalizeBuildDirArg('no-llm');
    assert.equal(n.mistakenModeFlag, 'deterministic');
    assert.equal(suggestedBuildFlagForMistake('deterministic'), '--no-llm');
  });

  it('real path unchanged', () => {
    const n = normalizeBuildDirArg('packages/foo');
    assert.equal(n.projectDir, 'packages/foo');
    assert.equal(n.mistakenModeFlag, undefined);
  });
});

describe('assertProjectRootExists', () => {
  it('throws for missing directory', () => {
    const missing = path.join(os.tmpdir(), `cg-missing-${Date.now()}`);
    assert.throws(() => assertProjectRootExists(missing), /does not exist/);
  });

  it('passes for existing directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-ok-'));
    assert.doesNotThrow(() => assertProjectRootExists(dir));
  });
});
