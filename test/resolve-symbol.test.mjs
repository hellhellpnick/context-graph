import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSymbolLookupRows,
  buildSymbolIndexMd,
  resolveSymbolQuery,
} from '../dist/graph-builder/resolve-symbol.js';

const plan = {
  subsystems: [
    {
      file: 'frontend/dev/components/common/_bundle.instructions.md',
      area: 'Common',
      priority: 'P1',
      sourceFiles: ['frontend/dev/components/common/LinkTag.vue'],
      applyTo: 'frontend/dev/components/common/**',
    },
  ],
};

describe('symbol-index', () => {
  it('maps LinkTag to bundle instruction', () => {
    const rows = buildSymbolLookupRows(plan);
    assert.ok(rows.some(r => r.lookupKey === 'LinkTag'));
    assert.ok(rows.some(r => r.lookupKey === 'LinkTag.vue'));
    const md = buildSymbolIndexMd('2026-05-18', plan);
    assert.match(md, /LinkTag/);
    assert.match(md, /_bundle\.instructions\.md/);
  });

  it('resolveSymbolQuery finds by name', () => {
    const rows = buildSymbolLookupRows(plan);
    const hits = resolveSymbolQuery('/tmp', 'LinkTag', rows);
    assert.ok(hits.length >= 1);
    assert.ok(hits.every(h => /common\/_bundle/.test(h.instructionFile)));
  });
});
