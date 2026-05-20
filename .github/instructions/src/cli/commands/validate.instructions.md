---
description: "Mirror — `src/cli/commands/validate.ts`"
applyTo: "src/cli/commands/validate.ts"
priority: "P1"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `validate.ts`

## Overview
- `src/cli/commands/validate.ts` (52 lines · 1 top-level symbols) — Mirror — `src/cli/commands/validate.ts`

## Graph
```mermaid
graph LR
  validate[validate]
  validate --> io[io]
  validate --> hooks[hooks]
  validate --> project_root[project-root]
  validate --> chalk["chalk"]
  validate --> commander["commander"]
```

## Signatures

```typescript
// ── src/cli/commands/validate.ts ──
export function registerValidateCommand(program: Command): void { /* ~43 lines */ }


// CLI commands:
//   validate
```

## Dependencies
**Internal:**
- `src/cli/io`
- `src/hooks`
- `src/project-root`

**External:**
- `chalk`
- `commander`

## Danger Zone 🔴
- **[fs]** filesystem I/O
