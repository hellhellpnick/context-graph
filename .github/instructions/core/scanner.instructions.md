---
description: "Scanner — src/scanner.ts"
applyTo: "src/scanner.ts"
priority: "P2"
last_updated: "2026-05-05"
---

## When to Read
- editing or refactoring `scanner.ts`

## Overview
- `src/scanner.ts` (291 lines · 6 exports) — Scanner — src/scanner.ts

## Graph
```mermaid
graph LR
  scanner[scanner]
  scanner --> glob["glob · npm"]
  scanner --> ignore["ignore · npm"]
```

## Signatures

### Notes (LLM)

- **classifyFile**: Determines the type of content for files.
- **formatForLLM**: Prepares text for language model processing.
- **scanForPromptDepth**: Analyzes file depth to generate prompts.
- **scanProject**: Initiates scanning a project directory.


```typescript
// ── src/scanner.ts ──
export interface ScannedFile { path: string; tier: 0 | 1 | 2 | 3; content: string; lines: number; truncated: boolean; }
export interface ScanResult { tree: string; files: ScannedFile[]; tokenEstimate: number; fileCount: number; skippedCount: number; }
export function classifyFile(relPath: string): 0 | 1 | 2 | 3 { const normalized = relPath.replace(/\\/g, '/'); const parts = normalized.split('/'); const name = parts[parts.length - 1]; if (parts.some(p => TIER3_DIRS.has(p))) return 3; i…
export async function scanProject( projectRoot: string, maxFiles = 200, maxInputTokens = 80000, options?: { unlimited?: boolean } ): Promise<ScanResult> { const unlimited = options?.unlimited ?? false; const ig = ignore(); const gitignor…
export function formatForLLM(scan: ScanResult): string { const parts: string[] = ['## Project File Tree\n', scan.tree, '\n']; const tier0 = scan.files.filter(f => f.tier === 0 && f.content); if (tier0.length > 0) { parts.push('\n## Tier …
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