---
description: "Mirror — `.cursor/rules/` (2 files, part 20/20)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `ctxgraph--src-writer.mdc`
- editing or refactoring `ctxgraph--test-bundle.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-writer.mdc` (45 lines · 4 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--test-bundle.mdc` (59 lines · 1 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--src-writer.mdc ──
// ── src/writer.ts ──
export interface OutputFile { path: string; content: string; }
export interface WriteResult { created: string[]; updated: string[]; errors: { path: string; error: string }[]; }
/**
 * Parse LLM response with multiple fallback strategies for different output formats.
 * Tries in order:
 *   1. <<<FILE: path>>>...<<<EOF>>>
 *   2. <!-- FILE: path -->```...```
 *   3. ## FILE: path\n```...```
 *   4. ```path/to/file.ext\n...```
 */
export function parseOutputFiles(response: string): OutputFile[] { /* prompt template (~17 lines) */ }
export function writeOutputFiles(files: OutputFile[], projectRoot: string): WriteResult { /* ~33 lines */ }

// ── .cursor/rules/ctxgraph--test-bundle.mdc ──
// ── test/extract.test.mjs ──
 * Framework-aware deterministic extraction (no LLM).
 */
export function foo() {}`;

```

## Dependencies
- No dependencies detected
