import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeterministicCopilotIgnore } from '../dist/graph-builder/deterministic/root.js';

describe('buildDeterministicCopilotIgnore', () => {
  it('does not exclude frontend/ when only frontend/yarn.lock is tier 3', () => {
    const scan = {
      files: [
        { path: 'frontend/dev/pages/index.vue', tier: 2, content: '', lines: 0, truncated: false },
        { path: 'frontend/yarn.lock', tier: 3, content: '', lines: 0, truncated: false },
        { path: 'frontend/node_modules/foo/index.js', tier: 3, content: '', lines: 0, truncated: false },
      ],
      tree: '',
      tokenEstimate: 0,
      fileCount: 0,
      skippedCount: 0,
    };
    const text = buildDeterministicCopilotIgnore(scan);
    assert.doesNotMatch(text, /^frontend\/$/m);
    assert.doesNotMatch(text, /\nfrontend\/\n/);
    assert.match(text, /\*\*\/yarn\.lock/);
    assert.match(text, /\*\*\/node_modules\//);
  });

  it('does not add yarn.lock/ as a directory', () => {
    const scan = {
      files: [{ path: 'yarn.lock', tier: 3, content: '', lines: 0, truncated: false }],
      tree: '',
      tokenEstimate: 0,
      fileCount: 0,
      skippedCount: 0,
    };
    const text = buildDeterministicCopilotIgnore(scan);
    assert.doesNotMatch(text, /^yarn\.lock\/$/m);
    assert.match(text, /\*\*\/yarn\.lock/);
  });
});
