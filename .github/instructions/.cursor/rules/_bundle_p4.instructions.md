---
description: "Mirror — `.cursor/rules/` (4 files, part 4/20)"
applyTo: ".cursor/rules/**"
priority: "P2"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `ctxgraph--src-cli-commands-impact.mdc`
- editing or refactoring `ctxgraph--src-cli-commands-resolve.mdc`
- editing or refactoring `ctxgraph--src-cli-commands-review.mdc`
- editing or refactoring `ctxgraph--src-cli-commands-validate.mdc`

## Overview
- `.cursor/rules/ctxgraph--src-cli-commands-impact.mdc` (52 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-cli-commands-resolve.mdc` (48 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-cli-commands-review.mdc` (52 lines · 1 top-level symbols) — # When to Read
- `.cursor/rules/ctxgraph--src-cli-commands-validate.mdc` (49 lines · 1 top-level symbols) — # When to Read

## Graph
```mermaid
graph LR
  Rules[Rules]
```

## Signatures

```typescript
// ── .cursor/rules/ctxgraph--src-cli-commands-impact.mdc ──
// ── src/cli/commands/impact.ts ──
export function registerImpactCommand(program: Command): void { /* ~33 lines */ }

// ── .cursor/rules/ctxgraph--src-cli-commands-resolve.mdc ──
// ── src/cli/commands/resolve.ts ──
export function registerResolveCommand(program: Command): void { /* ~38 lines */ }

// ── .cursor/rules/ctxgraph--src-cli-commands-review.mdc ──
// ── src/cli/commands/review.ts ──
export function registerReviewCommand(program: Command): void { /* ~41 lines */ }

// ── .cursor/rules/ctxgraph--src-cli-commands-validate.mdc ──
// ── src/cli/commands/validate.ts ──
export function registerValidateCommand(program: Command): void { /* ~43 lines */ }

```

## Dependencies
- No dependencies detected
