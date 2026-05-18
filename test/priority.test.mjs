import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferFilePriority,
  inferSubsystemPriority,
  maxPriority,
} from '../dist/graph-builder/plan/priority.js';

/** @type {Array<{ path: string, want: string, opts?: object }>} */
const fileCases = [
  { path: 'pages/foo.vue', want: 'P0' },
  { path: 'app/blog/page.tsx', want: 'P0' },
  { path: 'components/Button.vue', want: 'P2', opts: { lines: 40 } },
  { path: 'src/scanner.ts', want: 'P0' },
  { path: 'src/graph-builder/plan/priority.ts', want: 'P1' },
  { path: 'src/project-root.ts', want: 'P1' },
  { path: 'composables/useNews.ts', want: 'P1' },
  { path: 'package.json', want: 'P1', opts: { tier: 1 } },
  { path: 'src/index.ts', want: 'P0', opts: { tier: 1 } },
  { path: '.github/workflows/ci.yml', want: 'P1', opts: { tier: 0 } },
  { path: 'src/graph-builder/messages/planning.ts', want: 'P2' },
  { path: '__tests__/scanner.test.ts', want: 'P2' },
  { path: 'layouts/default.vue', want: 'P1', opts: { lines: 60 } },
];

describe('inferFilePriority', () => {
  for (const { path: relPath, want, opts } of fileCases) {
    it(`${relPath} → ${want}`, () => {
      assert.equal(inferFilePriority(relPath, opts), want);
    });
  }
});

describe('maxPriority', () => {
  it('P0 wins over P1 and P2', () => {
    assert.equal(maxPriority('P0', 'P1'), 'P0');
    assert.equal(maxPriority('P2', 'P0'), 'P0');
  });
});

describe('inferSubsystemPriority', () => {
  it('empty → P2', () => {
    assert.equal(inferSubsystemPriority([]), 'P2');
  });

  it('chunk uses highest file priority', () => {
    assert.equal(
      inferSubsystemPriority(['components/A.vue', 'pages/home.vue'], undefined),
      'P0'
    );
  });

  it('two files in src/foo/ bumps to at least P1', () => {
    assert.equal(
      inferSubsystemPriority(['src/foo/a.ts', 'src/foo/b.ts'], undefined),
      'P1'
    );
  });
});
