import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAgentEntryMandate,
  buildCopilotGraphMandate,
  buildCursorRouterMandate,
  buildWindsurfContextGraphRule,
} from '../dist/graph-builder/deterministic/routing-mandate.js';

describe('routing-mandate', () => {
  it('uses imperative MUST/BLOCKING, not when/should/prefer', () => {
    const joined = [
      ...buildAgentEntryMandate(),
      ...buildCopilotGraphMandate('src/foo.ts'),
      ...buildCursorRouterMandate(),
    ].join('\n');
    assert.match(joined, /BLOCKING/);
    assert.match(joined, /\*\*MUST\*\*/);
    assert.doesNotMatch(joined, /\bwhen\b.*applyTo/i);
    assert.doesNotMatch(joined, /\bshould\b/i);
    assert.doesNotMatch(joined, /\bprefer\b/i);
    assert.match(joined, /symbol-index/);
    assert.match(joined, /FORBIDDEN.*grep/i);
  });

  it('Windsurf rule uses trigger always_on frontmatter', () => {
    const md = buildWindsurfContextGraphRule();
    assert.match(md, /^---\ntrigger: always_on\n---/);
    assert.match(md, /BLOCKING/);
  });
});
