---
description: "Mirror — `src/agents-catalog.ts`"
applyTo: "src/agents-catalog.ts"
priority: "P2"
last_updated: "2026-05-18"
---

## When to Read
- editing or refactoring `agents-catalog.ts`

## Overview
- `src/agents-catalog.ts` (350 lines · 4 top-level symbols) — Curated index of agency-agents (https://github.com/msitarzewski/agency-agents).

## Graph
```mermaid
graph LR
  agents_catalog[agents-catalog]
```

## Signatures

```typescript
// ── src/agents-catalog.ts ──
/**
 * Curated index of agency-agents (https://github.com/msitarzewski/agency-agents).
 *
 * Each entry describes:
 *   - where the .md file lives in the upstream repo
 *   - what project signals trigger a match
 *   - a short description for the generated README
 */
export interface AgentEntry { /* ~16 lines */ }
export interface AgentMatchRule { /** File extensions present in the project (e.g. ['.ts', '.tsx']) */ extensions?: string[]; /** File/dir names that indicate relevance (e.g. ['Dockerfile', 'docker-compose']) */ filePatterns?: RegExp[]; …
export const AGENTS_CATALOG: AgentEntry[] = [ // ── Engineering ─────────────────────────────────────────────────────────── { /* prompt template (~295 lines) */ }
/** Maximum agents to recommend by default */
export const MAX_RECOMMENDED_AGENTS = 10;

```

## Dependencies
- No dependencies detected
