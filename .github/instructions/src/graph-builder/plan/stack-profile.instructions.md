---
description: "Mirror — `src/graph-builder/plan/stack-profile.ts`"
applyTo: "src/graph-builder/plan/stack-profile.ts"
priority: "P1"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `stack-profile.ts`

## Overview
- `src/graph-builder/plan/stack-profile.ts` (70 lines · 5 top-level symbols) — Mirror — `src/graph-builder/plan/stack-profile.ts`

## Graph
```mermaid
graph LR
  stack_profile[stack-profile]
  stack_profile --> scanner[scanner]
```

## Signatures

```typescript
// ── src/graph-builder/plan/stack-profile.ts ──
export type ProjectStackProfile = { laravel: boolean; php: boolean; node: boolean; vue: boolean; nuxt: boolean; /** Repo-relative directory containing `nuxt.config.*` (e.g. `frontend/dev`). */ nuxtRoot?: string; };
/** First `nuxt.config.*` path in scan order (stable). */
export function findNuxtConfigPath(scan: ScanResult): string | undefined { for (const f of scan.files) { const p = f.path.replace(/\\/g, '/'); if (NUXT_CONFIG_RE.test(p)) return p; } return undefined; }
export function countScannedVueFiles(scan: ScanResult): number { return scan.files.filter(f => f.path.endsWith('.vue') && f.tier !== 3).length; }
export function detectProjectStackProfile(scan: ScanResult): ProjectStackProfile { /* ~24 lines */ }
/** Auto `by-folder` for Laravel / large PHP trees / Nuxt & large Vue apps. */
export function shouldAutoFolderGrouping( scan: ScanResult, profile: ProjectStackProfile, subsystemGrouping: 'default' | 'by-folder' ): boolean { /* ~16 lines */ }

```

## Dependencies
**Internal:**
- `src/scanner`
