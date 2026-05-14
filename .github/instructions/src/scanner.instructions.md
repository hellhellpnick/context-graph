---
description: "Mirror — `src/scanner.ts`"
applyTo: "src/scanner.ts"
priority: "P2"
last_updated: "2026-05-13"
---

## When to Read
- editing or refactoring `scanner.ts`

## Overview
- `src/scanner.ts` (302 lines · 7 exports) — Root files with gitignore-style rules, scanned after `.gitignore` / `.copilotignore`.

## Graph
```mermaid
graph LR
  scanner[scanner]
  scanner --> glob["glob · npm"]
  scanner --> ignore["ignore · npm"]
```

## Signatures

```typescript
// ── src/scanner.ts ──
/** Root files with gitignore-style rules, scanned after `.gitignore` / `.copilotignore`. */
export const GRAPH_CONTEXT_IGNORE_FILENAMES = ['.graph-context-ignore', '.context-graph-ignore'] as const;
export interface ScannedFile { path: string; tier: 0 | 1 | 2 | 3; content: string; lines: number; truncated: boolean; }
export interface ScanResult { tree: string; files: ScannedFile[]; tokenEstimate: number; fileCount: number; skippedCount: number; }
export function classifyFile(relPath: string): 0 | 1 | 2 | 3 { const normalized = relPath.replace(/\\/g, '/'); const parts = normalized.split('/'); const name = parts[parts.length - 1]; if (parts.some(p => TIER3_DIRS.has(p))) return 3; i…
export async function scanProject( projectRoot: string, maxFiles = 200, maxInputTokens = 80000, options?: { unlimited?: boolean } ): Promise<ScanResult> { const unlimited = options?.unlimited ?? false; const ig = ignore(); const gitignor…
export function formatForLLM(scan: ScanResult): string { const parts: string[] = ['## Project File Tree\n', scan.tree, '\n']; const tier0 = scan.files.filter(f => f.tier === 0 && f.content); if (tier0.length > 0) { parts.push('\n## Tier …
/**
 * Returns a shallow copy of the scan with long file bodies truncated for LLM prompts.
 * Tier 0–2 only; Tier 3 unchanged. Does not replace full scan for `repairBuildPlan` / `buildMetadataJson`.
 */
export function scanForPromptDepth(scan: ScanResult, depth: 'full' | 'slim'): ScanResult { if (depth === 'full') return scan; const files = scan.files.map(f => { if (f.tier === 3 || !f.content) return f; const lines = f.content.split('\n…

```

## Dependencies
**External (npm):**
- `glob`
- `ignore`

## Error Handling
- No explicit throws detected

## Danger Zone 🔴
- No env vars or side effects detected