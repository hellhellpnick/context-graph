---
description: "Mirror — `.cursor/rules/` (4 files, part 33/51)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `ctxgraph--src-cli-commands-resolve.mdc`
- editing or refactoring `ctxgraph--src-cli-commands-review.mdc`
- editing or refactoring `ctxgraph--src-cli-commands-validate.mdc`
- editing or refactoring `ctxgraph--src-cli-index.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-cli-commands-resolve.mdc` (48 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-cli-commands-review.mdc` (52 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-cli-commands-validate.mdc` (53 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-cli-index.mdc` (42 lines) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
  Rules --> node[""]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--src-cli-commands-resolve.mdc ──
// ── src/cli/commands/resolve.ts ──
export function registerResolveCommand(program: Command): void { /* ~38 lines */ }

// ── .cursor/rules/ctxgraph--src-cli-commands-review.mdc ──
// ── src/cli/commands/review.ts ──
export function registerReviewCommand(program: Command): void { /* ~41 lines */ }

// ── .cursor/rules/ctxgraph--src-cli-commands-validate.mdc ──
// ── src/cli/commands/validate.ts ──
export function registerValidateCommand(program: Command): void { /* ~64 lines */ }

```

## Dependencies
**External:**
- ``
