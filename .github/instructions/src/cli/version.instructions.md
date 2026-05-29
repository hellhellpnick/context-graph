---
description: "Mirror — `src/cli/version.ts`"
applyTo: "src/cli/version.ts"
priority: "P1"
last_updated: "2026-05-29"
---

## When to Read
- editing or refactoring `version.ts`

## Overview
- `src/cli/version.ts` (3 lines · 1 top-level symbols) — Mirror — `src/cli/version.ts`

## Graph
```mermaid
graph LR
  version[version]
  version --> package["package"]
```

## Signatures

```typescript
// ── src/cli/version.ts ──
export const PKG_VERSION: string = (require('../../package.json') as { version: string }).version;

```

## Dependencies
**External:**
- `package`
