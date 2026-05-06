---
description: "Agents Catalog — src/agents-catalog.ts"
applyTo: "src/agents-catalog.ts"
priority: "P2"
last_updated: "2026-05-05"
---

## When to Read
- editing or refactoring `agents-catalog.ts`

## Overview
- `src/agents-catalog.ts` (350 lines · 4 exports) — Curated index of agency-agents (https://github.com/msitarzewski/agency-agents).

## Graph
```mermaid
graph LR
  agents-catalog[agents-catalog]
```

## Signatures

### Notes (LLM)

```markdown
- **AGENTS_CATALOG**: Array of agent entries, each containing metadata like slug, name, description, usage guidelines, and match rules. Intent is for cataloging relevant agents based on file extensions, dependencies, file patterns, and tech stack keywords.
- **MAX_RECOMMENDED_AGENTS**: Maximum recommended number of agents to be used in a project. Default value is 10.

GOTCHAS:
- `match` objects within `AgentEntry` are critical for auto-matching agents based on project signals (file types, dependencies, tech stack). Incorrect setup can lead to missed matches or false positives.
- Ensure `repoPath` points to the correct location in the upstream repository. Misleading paths can cause confusion and misdirected agent usage.
- Agents in 'specialized' category might require extra setup steps not covered by generic usage instructions.

FAILURE MODES:
- Incorrect `match` rules might trigger agents for non-relevant contexts, leading to noise or inefficient use of resources.
- Missing dependencies in `match` objects can cause runtime errors, interrupting the agent's functionality.
- Invalid or non-existing file patterns can result in incomplete catalog entries, missing crucial information.

UNKNOWN:
- No specific unknowns based on provided snippets; further details (e.g., actual repository or project structure) may reveal additional nuances.
```


```typescript
// ── src/agents-catalog.ts ──
export interface AgentEntry { /** Slug used as filename: <slug>.md */ slug: string; /** Human-readable name */ name: string; /** One-line description of what this agent does */ description: string; /** How / when to use it (shown in READ…
export interface AgentMatchRule { /** File extensions present in the project (e.g. ['.ts', '.tsx']) */ extensions?: string[]; /** File/dir names that indicate relevance (e.g. ['Dockerfile', 'docker-compose']) */ filePatterns?: RegExp[]; …
export const AGENTS_CATALOG: AgentEntry[] = [ // ── Engineering ─────────────────────────────────────────────────────────── { slug: 'frontend-developer', name: 'Frontend Developer', description: 'React/Vue/Angular, UI implementation, per…
export const MAX_RECOMMENDED_AGENTS = 10;

```

## Dependencies
- No dependencies detected

## Error Handling
- No explicit throws detected

## Danger Zone 🔴
- No env vars or side effects detected