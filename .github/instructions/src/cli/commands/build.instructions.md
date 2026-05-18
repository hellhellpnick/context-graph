---
description: "Mirror — `src/cli/commands/build.ts`"
applyTo: "src/cli/commands/build.ts"
priority: "P1"
last_updated: "2026-05-18"
---

## When to Read
- editing or refactoring `build.ts`

## Overview
- `src/cli/commands/build.ts` (309 lines · 1 top-level symbols) — Mirror — `src/cli/commands/build.ts`

## Graph
```mermaid
graph LR
  build[build]
  build --> agents_install[agents-install]
  build --> build_run[build-run]
  build --> io[io]
  build --> config[config]
  build --> hooks[hooks]
  build --> project_root[project-root]
  build --> scanner[scanner]
  build --> writer[writer]
  build --> chalk["chalk"]
  build --> commander["commander"]
  build --> ora["ora"]
  build --> ENV{{"env / config"}}
```

## Signatures

```typescript
// ── src/cli/commands/build.ts ──
export function registerBuildCommand(program: Command): void { /* ~279 lines */ }


// CLI commands:
//   build
```

## Dependencies
**Internal:**
- `src/cli/agents-install`
- `src/cli/build-run`
- `src/cli/io`
- `src/config`
- `src/hooks`
- `src/project-root`
- `src/scanner`
- `src/writer`

**External:**
- `chalk`
- `commander`
- `ora`

## Danger Zone 🔴
- **[env]** reads `process.env.CONTEXT_GRAPH_PROVIDER`
- **[env]** reads `process.env.CONTEXT_GRAPH_MODEL`
- **[fs]** filesystem I/O
