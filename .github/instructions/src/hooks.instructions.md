---
description: "Mirror — `src/hooks.ts`"
applyTo: "src/hooks.ts"
priority: "P2"
last_updated: "2026-05-13"
---

## When to Read
- editing or refactoring `hooks.ts`

## Overview
- `src/hooks.ts` (103 lines · 4 exports) — Mirror — `src/hooks.ts`

## Graph
```mermaid
graph LR
  hooks[hooks]
  hooks --> scanner[scanner]
```

## Signatures

```typescript
// ── src/hooks.ts ──
export function installPrePushHook(projectRoot: string): 'installed' | 'updated' | 'skipped' { const hooksDir = path.join(projectRoot, '.git', 'hooks'); if (!fs.existsSync(hooksDir)) return 'skipped'; const hookPath = path.join(hooksDir,…
export function saveLastBuildRef(projectRoot: string): void { const refFile = path.join(projectRoot, '.context-graph-last-build'); try { const sha = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', '…
export function getChangedFilesSinceLastBuild(projectRoot: string): string[] { const refFile = path.join(projectRoot, '.context-graph-last-build'); if (!fs.existsSync(refFile)) return []; const ref = fs.readFileSync(refFile, 'utf8').trim…
export function filterSignificantFiles(files: string[]): string[] { return files.filter(f => { const tier = classifyFile(f); return tier === 0 || tier === 1 || tier === 2; }); }

```

## Dependencies
**Internal:**
- `src/scanner`

## Error Handling
- No explicit throws detected

## Danger Zone 🔴
- No env vars or side effects detected