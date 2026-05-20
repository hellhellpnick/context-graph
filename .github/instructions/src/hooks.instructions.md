---
description: "Mirror — `src/hooks.ts`"
applyTo: "src/hooks.ts"
priority: "P1"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `hooks.ts`

## Overview
- `src/hooks.ts` (103 lines · 4 top-level symbols) — Mirror — `src/hooks.ts`

## Graph
```mermaid
graph LR
  hooks[hooks]
  hooks --> scanner[scanner]
```

## Signatures

```typescript
// ── src/hooks.ts ──
export function installPrePushHook(projectRoot: string): 'installed' | 'updated' | 'skipped' { /* ~20 lines */ }
export function saveLastBuildRef(projectRoot: string): void { const refFile = path.join(projectRoot, '.context-graph-last-build'); try { const sha = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', '…
export function getChangedFilesSinceLastBuild(projectRoot: string): string[] { /* ~28 lines */ }
export function filterSignificantFiles(files: string[]): string[] { return files.filter(f => { const tier = classifyFile(f); return tier === 0 || tier === 1 || tier === 2; }); }

```

## Dependencies
**Internal:**
- `src/scanner`

## Danger Zone 🔴
- **[fs]** filesystem I/O
