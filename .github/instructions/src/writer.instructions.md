---
description: "Mirror — `src/writer.ts`"
applyTo: "src/writer.ts"
priority: "P2"
last_updated: "2026-05-13"
---

## When to Read
- editing or refactoring `writer.ts`

## Overview
- `src/writer.ts` (191 lines · 4 exports) — Parse LLM response with multiple fallback strategies for different output formats.

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
export function parseOutputFiles(response: string): OutputFile[] { // Strategy 1: Primary format with <<<FILE:>>> delimiters let files = parsePrimaryFormat(response); if (files.length > 0) return files; // Strategy 2: HTML comments with …
export function writeOutputFiles(files: OutputFile[], projectRoot: string): WriteResult { const result: WriteResult = { created: [], updated: [], errors: [] }; for (const file of files) { // Guard against path traversal (normalize for ca…

```

## Dependencies
- No dependencies detected

## Error Handling
- No explicit throws detected

## Danger Zone 🔴
- No env vars or side effects detected