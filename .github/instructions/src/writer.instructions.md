---
description: "Mirror — `src/writer.ts`"
applyTo: "src/writer.ts"
priority: "P0"
last_updated: "2026-05-15"
---

## When to Read
- editing or refactoring `writer.ts`

## Overview
- `src/writer.ts` (191 lines · 4 top-level symbols) — Parse LLM response with multiple fallback strategies for different output formats.

## Graph
```mermaid
graph LR
  writer[writer]
```

## Signatures

```typescript
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

```

## Dependencies
- No dependencies detected

## Danger Zone 🔴
- **[fs]** filesystem I/O
